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
  isSectionNodeType,
  ManuscriptNode,
} from '@manuscripts/manuscript-transform'
import { ManuscriptTemplate, Model } from '@manuscripts/manuscripts-json-schema'

import {
  buildManuscriptCountRequirements,
  buildRequiredSections,
  buildSectionCountRequirements,
  buildTemplateRequirementIDs,
  buildTemplateRequirements,
  buildTemplateRequirementsMap,
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

  const sectionCategories = new Set<string>()

  for (const node of iterateChildren(article)) {
    if (isSectionNodeType(node.type)) {
      const { category } = node.attrs

      if (category) {
        sectionCategories.add(category)
      }
    }
  }

  const results: ValidationResult[] = []

  for (const requiredSection of requiredSections) {
    const { category, severity } = requiredSection

    results.push({
      type: 'required-section',
      passed: sectionCategories.has(category),
      severity,
      data: { category },
    })
  }

  const manuscriptText = buildText(article)

  const manuscriptCounts = {
    characters: await countCharacters(manuscriptText),
    words: await countWords(manuscriptText),
  }

  if (manuscriptCountRequirements.characters.max) {
    results.push({
      type: 'manuscript-maximum-characters',
      passed:
        manuscriptCounts.characters <=
        manuscriptCountRequirements.characters.max.count,
      severity: manuscriptCountRequirements.characters.max.severity,
      data: { count: manuscriptCounts.characters },
    })
  }

  return results
}
