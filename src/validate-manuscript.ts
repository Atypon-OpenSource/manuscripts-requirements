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
import customTemplates from '@manuscripts/data/dist/shared/custom-templates.json'
import templates from '@manuscripts/data/dist/shared/templates-v2.json'
import { ManuscriptTemplate, Model } from '@manuscripts/manuscripts-json-schema'

import { countCharacters, countWords } from './statistics'
import { createRequirementsValidator, RequirementsValidator } from './validate'

export const createTemplateValidator = (
  templateID: string
): RequirementsValidator => {
  const templatesMap = new Map<string, Model>()

  for (const template of templates as Model[]) {
    templatesMap.set(template._id, template)
  }

  for (const template of customTemplates as Model[]) {
    templatesMap.set(template._id, template)
  }

  const modelMap = new Map<string, Model>()

  const template = templatesMap.get(templateID) as
    | ManuscriptTemplate
    | undefined

  if (!template) {
    throw new Error('Could not find template')
  }

  if (template.requirementIDs) {
    for (const requirementID of template.requirementIDs) {
      const requirement = templatesMap.get(requirementID)

      if (requirement) {
        modelMap.set(requirement._id, requirement)
      }
    }
  }

  const requirementFields: Array<keyof ManuscriptTemplate> = [
    'manuscriptRunningTitleRequirement',
    'maxCharCountRequirement',
    'maxCombinedFigureTableCountRequirement',
    'maxFigureFileSizeRequirement',
    'maxFigureScreenDPIRequirement',
    'maxManuscriptTitleCharacterCountRequirement',
    'maxManuscriptTitleWordCountRequirement',
    'maxPageCountRequirement',
    'maxTableCountRequirement',
    'maxWordCountRequirement',
    'minCharCountRequirement',
    'minCombinedFigureTableCountRequirement',
    'minFigureCountRequirement',
    'minFigureScreenDPIRequirement',
    'minPageCountRequirement',
    'minWordCountRequirement',
  ]

  for (const requirementField of requirementFields) {
    const requirementID = template[requirementField]

    if (requirementID) {
      const requirement = templatesMap.get(requirementID as string)

      if (requirement) {
        modelMap.set(requirement._id, requirement)
      }
    }
  }

  // TODO: add requirements of sections/subsections?
  // TODO: build a requirements object?

  return createRequirementsValidator(modelMap, {
    countCharacters,
    countWords,
  })
}
