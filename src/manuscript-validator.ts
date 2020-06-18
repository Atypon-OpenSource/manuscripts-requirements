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
  isSectionNode,
  ManuscriptNode,
  SectionNode,
} from '@manuscripts/manuscript-transform'
import { ManuscriptTemplate } from '@manuscripts/manuscripts-json-schema'

import {
  buildManuscriptCountRequirements,
  buildRequiredSections,
  buildSectionCountRequirements,
  buildTemplateRequirementIDs,
  buildTemplateRequirements,
  buildTemplateRequirementsMap,
  CountRequirement,
  CountRequirements,
  CountValidationResult,
  CountValidationType,
  RequiredSections,
  RequiredSectionValidationResult,
  SectionCountRequirements,
  TemplateRequirements,
  ValidationResult,
} from './requirements'
import { buildText, countCharacters, countWords } from './statistics'
import { templatesMap } from './templates'

function* iterateChildren(
  node: ManuscriptNode,
  recurse = false
): Iterable<ManuscriptNode> {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i)
    yield child

    if (recurse) {
      for (const grandchild of iterateChildren(child, true)) {
        yield grandchild
      }
    }
  }
}

interface Counts {
  words: number
  characters: number
}

const buildRequirementsForTemplate = (
  templateID: string
): TemplateRequirements => {
  const template = templatesMap.get(templateID) as ManuscriptTemplate
  const requirementIDs = buildTemplateRequirementIDs(template)
  const requirementsMap = buildTemplateRequirementsMap(requirementIDs)

  return buildTemplateRequirements(requirementsMap)
}

type SectionsWithCategory = Map<
  string,
  Array<{ node: SectionNode; counts: Counts }>
>

const buildSectionsWithCategory = async (
  article: ManuscriptNode
): Promise<SectionsWithCategory> => {
  const output: SectionsWithCategory = new Map()

  for (const node of iterateChildren(article)) {
    if (isSectionNode(node)) {
      const { category } = node.attrs

      if (category) {
        const sections = output.get(category) || []

        const text = buildText(node)

        const counts = {
          characters: await countCharacters(text),
          words: await countWords(text),
        }

        sections.push({ node, counts })

        output.set(category, sections)
      }
    }
  }

  return output
}

// TODO: check that sections are in the right order?
async function* validateRequiredSections(
  requiredSections: RequiredSections,
  sectionCategories: Set<string>
): AsyncGenerator<RequiredSectionValidationResult> {
  for (const requiredSection of requiredSections) {
    const { category, severity } = requiredSection

    yield {
      type: 'required-section',
      passed: sectionCategories.has(category),
      severity,
      data: { category },
    }
  }
}

const validateCount = (
  type: CountValidationType,
  count: number,
  requirement?: CountRequirement
): CountValidationResult | undefined => {
  if (requirement) {
    const value = requirement.count

    return {
      type,
      passed: count <= value,
      severity: requirement.severity,
      data: { count, value },
    }
  }
}

async function* validateManuscriptCounts(
  article: ManuscriptNode,
  manuscriptCountRequirements: CountRequirements
): AsyncGenerator<CountValidationResult | undefined> {
  const manuscriptText = buildText(article)

  const manuscriptCounts: Counts = {
    characters: await countCharacters(manuscriptText),
    words: await countWords(manuscriptText),
  }

  yield validateCount(
    'manuscript-maximum-characters',
    manuscriptCounts.characters,
    manuscriptCountRequirements.characters.max
  )

  yield validateCount(
    'manuscript-minimum-characters',
    manuscriptCounts.characters,
    manuscriptCountRequirements.characters.min
  )

  yield validateCount(
    'manuscript-maximum-words',
    manuscriptCounts.words,
    manuscriptCountRequirements.words.max
  )

  validateCount(
    'manuscript-minimum-words',
    manuscriptCounts.words,
    manuscriptCountRequirements.words.min
  )
}

async function* validateSectionCounts(
  sectionsWithCategory: SectionsWithCategory,
  sectionCountRequirements: SectionCountRequirements
) {
  for (const [category, requirements] of Object.entries(
    sectionCountRequirements
  )) {
    const records = sectionsWithCategory.get(category)

    if (records) {
      for (const item of records) {
        yield validateCount(
          'section-maximum-characters',
          item.counts.characters,
          requirements.characters.max
        )

        yield validateCount(
          'section-minimum-characters',
          item.counts.characters,
          requirements.characters.min
        )

        yield validateCount(
          'section-maximum-words',
          item.counts.words,
          requirements.words.max
        )

        yield validateCount(
          'section-minimum-words',
          item.counts.words,
          requirements.words.min
        )
      }
    }
  }
}

export const validateManuscript = async (
  article: ManuscriptNode,
  templateID: string
) => {
  const results: ValidationResult[] = []

  const requirements = buildRequirementsForTemplate(templateID)
  const sectionsWithCategory = await buildSectionsWithCategory(article)

  // validate required sections
  const requiredSections = buildRequiredSections(requirements)
  const sectionCategories = new Set(sectionsWithCategory.keys())

  for await (const result of validateRequiredSections(
    requiredSections,
    sectionCategories
  )) {
    results.push(result)
  }

  // validate manuscript counts
  const manuscriptCountRequirements = buildManuscriptCountRequirements(
    requirements
  )

  for await (const result of validateManuscriptCounts(
    article,
    manuscriptCountRequirements
  )) {
    result && results.push(result)
  }

  // validate section counts
  const sectionCountRequirements = buildSectionCountRequirements(requirements)

  for await (const result of validateSectionCounts(
    sectionsWithCategory,
    sectionCountRequirements
  )) {
    result && results.push(result)
  }

  return results
}
