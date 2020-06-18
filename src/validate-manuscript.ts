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
import { ManuscriptTemplate, Model } from '@manuscripts/manuscripts-json-schema'

import {
  buildManuscriptCountRequirements,
  buildRequiredSections,
  buildSectionCountRequirements,
  buildTemplateRequirementIDs,
  buildTemplateRequirements,
  buildTemplateRequirementsMap,
  CountRequirement,
  ValidationResult,
  ValidationType,
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

export const validateManuscript = async (
  article: ManuscriptNode,
  modelMap: Map<string, Model>,
  templateID: string
) => {
  const template = templatesMap.get(templateID) as ManuscriptTemplate
  const requirementIDs = buildTemplateRequirementIDs(template)
  const requirementsMap = buildTemplateRequirementsMap(requirementIDs)
  const requirements = buildTemplateRequirements(requirementsMap)
  const requiredSections = buildRequiredSections(requirements)
  const manuscriptCountRequirements = buildManuscriptCountRequirements(
    requirements
  )
  const sectionCountRequirements = buildSectionCountRequirements(requirements)

  const sectionsWithCategory = new Map<
    string,
    Array<{ node: SectionNode; counts: Counts }>
  >()

  for (const node of iterateChildren(article)) {
    if (isSectionNode(node)) {
      const { category } = node.attrs

      if (category) {
        const sections = sectionsWithCategory.get(category) || []

        const text = buildText(node)

        const counts = {
          characters: await countCharacters(text),
          words: await countWords(text),
        }

        sections.push({ node, counts })

        sectionsWithCategory.set(category, sections)
      }
    }
  }

  const results: ValidationResult[] = []

  for (const requiredSection of requiredSections) {
    const { category, severity } = requiredSection

    results.push({
      type: 'required-section',
      passed: sectionsWithCategory.has(category),
      severity,
      data: { category },
    })
  }

  const validateCount = (
    type: ValidationType,
    count: number,
    requirement?: CountRequirement
  ) => {
    if (requirement) {
      results.push({
        type,
        passed: count <= requirement.count,
        severity: requirement.severity,
        data: { count },
      })
    }
  }

  const manuscriptText = buildText(article)

  const manuscriptCounts: Counts = {
    characters: await countCharacters(manuscriptText),
    words: await countWords(manuscriptText),
  }

  validateCount(
    'manuscript-maximum-characters',
    manuscriptCounts.characters,
    manuscriptCountRequirements.characters.max
  )

  validateCount(
    'manuscript-minimum-characters',
    manuscriptCounts.characters,
    manuscriptCountRequirements.characters.min
  )

  validateCount(
    'manuscript-maximum-words',
    manuscriptCounts.words,
    manuscriptCountRequirements.words.max
  )

  validateCount(
    'manuscript-minimum-words',
    manuscriptCounts.words,
    manuscriptCountRequirements.words.min
  )

  for (const [category, requirements] of Object.entries(
    sectionCountRequirements
  )) {
    const records = sectionsWithCategory.get(category)

    if (records) {
      for (const item of records) {
        validateCount(
          'section-maximum-characters',
          item.counts.characters,
          requirements.characters.max
        )

        validateCount(
          'section-minimum-characters',
          item.counts.characters,
          requirements.characters.min
        )

        validateCount(
          'section-maximum-words',
          item.counts.words,
          requirements.words.max
        )

        validateCount(
          'section-minimum-words',
          item.counts.words,
          requirements.words.min
        )
      }
    }
  }

  return results
}
