/*!
 * © 2020 Atypon Systems LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  ParagraphElement,
  Section,
  SectionDescription,
  SectionTitleValidationResult,
} from '@manuscripts/json-schema'
import {
  Build,
  buildParagraph,
  buildSection,
  ContainedModel,
  isManuscript,
  ManuscriptModel,
} from '@manuscripts/transform'

import { InputError } from './errors'
import { AnyValidationResult } from './types/requirements'
import { createRequiredModelProperties, isSection, nextPriority } from './utils'

type RequiredSection = { section: Section; placeholder?: ParagraphElement }

export const runManuscriptFixes = (
  manuscriptData: Array<ContainedModel>,
  manuscriptID: string,
  results: Array<AnyValidationResult>,
  { parser, serializer }: { parser: DOMParser; serializer: XMLSerializer }
): Array<ContainedModel> => {
  const modelsMap = new Map(manuscriptData.map((model) => [model._id, model]))
  const failedResults = results.filter((result) => !result.passed)
  // change updatedAt of the fixed objects?
  const manuscript = modelsMap.get(manuscriptID)
  // No manuscript object
  if (!manuscript || !isManuscript(manuscript)) {
    throw new InputError('Could not find a Manuscript object')
  }
  for (const result of failedResults) {
    switch (result.type) {
      case 'required-section': {
        const { data } = result
        const priority = nextPriority(manuscriptData)
        const requiredSection = addRequiredSection(
          data.sectionDescription,
          manuscript._id,
          manuscript.containerID,
          priority
        )
        manuscriptData.push(...requiredSection)
        break
      }
      case 'section-title-match': {
        const { affectedElementId } = result
        if (affectedElementId && modelsMap.has(affectedElementId)) {
          const modelToFix = modelsMap.get(affectedElementId) as ContainedModel
          retitleSection(result, modelToFix)
        } else {
          throw new Error(`${affectedElementId} not found`)
        }
        break
      }
      case 'section-order': {
        const { data } = result
        reorderSections(data.order, manuscriptData)
        break
      }
    }
  }
  return manuscriptData
}

const retitleSection = (
  result: Build<SectionTitleValidationResult>,
  model: ContainedModel
) => {
  const { data, affectedElementId } = result

  if (!isSection(model)) {
    throw new Error(`${affectedElementId} must be of type MPSection`)
  }
  model.title = data.title
}

const reorderSections = (
  orderedSections: Array<string>,
  data: Array<ContainedModel>
) => {
  const sectionsCategory = new Map(
    orderedSections.map((section, index) => [section, index])
  )
  const sectionsToFix = Array<Section>()
  data.forEach((model) => {
    if (isSection(model)) {
      const { category } = model
      if (category && sectionsCategory.has(category)) {
        sectionsToFix.push(model)
      }
    }
  })
  const sortedSections = sectionsToFix.sort((s1, s2) => {
    // Guaranteed that the section will have a category and contained in the HashMap
    const getIndex = (section: Section): number => {
      const { category } = section
      if (category) {
        return sectionsCategory.get(category) as number
      }
      return -1
    }
    return getIndex(s1) - getIndex(s2)
  })
  let priority = nextPriority(data)
  sortedSections.forEach((section) => (section.priority = priority++))
}

const createRequiredSection = (
  requirement: SectionDescription,
  manuscriptID: string,
  containerID: string,
  priority: number,
  path?: string[]
): RequiredSection => {
  const { title, sectionCategory } = requirement
  const [, categoryName] = sectionCategory.split(':')
  const capitalize = (name: string | undefined) => {
    if (name && name.length > 0) {
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
  }
  const section = {
    ...createRequiredModelProperties(manuscriptID, containerID),
    ...buildSection(priority, path),
    title: title || capitalize(categoryName),
    category: sectionCategory,
  } as Section
  const requiredSection: RequiredSection = {
    section: section,
  }

  const { placeholder } = requirement
  if (placeholder) {
    const placeholderParagraph = {
      ...createRequiredModelProperties(manuscriptID, containerID),
      ...buildParagraph(placeholder),
    } as ParagraphElement
    section.elementIDs = [placeholderParagraph._id]
    requiredSection.placeholder = placeholderParagraph
  }
  return requiredSection
}

const addRequiredSection = (
  requirement: SectionDescription,
  manuscriptID: string,
  containerID: string,
  priority: number,
): Array<ManuscriptModel> => {
  const parentSection = createRequiredSection(
    requirement,
    manuscriptID,
    containerID,
    priority
  )
  let manuscriptsModels: Array<ManuscriptModel> = [parentSection.section]
  if (parentSection.placeholder) {
    manuscriptsModels.push(parentSection.placeholder)
  }
  const { subsections } = requirement
  if (subsections) {
    let priority = 0
    manuscriptsModels = subsections
      .map((subsection) =>
        createRequiredSection(
          subsection as SectionDescription,
          manuscriptID,
          containerID,
          ++priority,
          [parentSection.section._id]
        )
      )
      .reduce((models, requiredSection) => {
        models.push(requiredSection.section)
        if (requiredSection.placeholder) {
          models.push(requiredSection.placeholder)
        }
        return models
      }, manuscriptsModels)
  }

  return manuscriptsModels
}

