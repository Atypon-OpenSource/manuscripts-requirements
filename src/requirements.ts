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
  MandatorySubsectionsRequirement,
  ManuscriptTemplate,
  Model,
  ObjectTypes,
} from '@manuscripts/manuscripts-json-schema'

import { templatesMap } from './templates'

// TODO: generate these from data?
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

// const isManuscriptTemplate = (model: Model): model is ManuscriptTemplate =>
//   model.objectType === ObjectTypes.ManuscriptTemplate

export const buildTemplateRequirementIDs = (
  template: ManuscriptTemplate
): string[] => {
  const ids: string[] = template.requirementIDs || []

  for (const requirementField of requirementFields) {
    const requirementID = template[requirementField]

    if (requirementID) {
      ids.push(requirementID as string)
    }
  }

  // TODO: Should requirements be inherited? They seem to be duplicates
  // if (template.parent) {
  //   // TODO: avoid loops
  //   for (const model of templatesMap.values()) {
  //     if (isManuscriptTemplate(model)) {
  //       // TODO: template.parent should be an id instead of a title
  //       if (model.title === template.parent) {
  //         ids.push(...buildTemplateRequirementIDs(model))
  //       }
  //     }
  //   }
  // }

  return ids
}

export type TemplateRequirementsMap = Map<string, Model>

export const buildTemplateRequirementsMap = (
  ids: string[]
): TemplateRequirementsMap => {
  const map: TemplateRequirementsMap = new Map()

  // TODO: use evaluatedObject?

  for (const id of ids) {
    const requirement = templatesMap.get(id)

    if (requirement) {
      map.set(id, requirement)
    }
  }

  return map
}

export type TemplateRequirements = Partial<Record<ObjectTypes, Model[]>>

export const buildTemplateRequirements = (
  requirementsMap: Map<string, Model>
): TemplateRequirements => {
  const requirements: TemplateRequirements = {}

  for (const requirement of requirementsMap.values()) {
    const objectType = requirement.objectType as ObjectTypes

    if (!(objectType in requirements)) {
      requirements[objectType] = []
    }

    requirements[objectType]?.push(requirement)
  }

  return requirements
}

export type CountValidationType =
  | 'manuscript-maximum-characters'
  | 'manuscript-minimum-characters'
  | 'manuscript-maximum-words'
  | 'manuscript-minimum-words'
  | 'section-maximum-characters'
  | 'section-minimum-characters'
  | 'section-maximum-words'
  | 'section-minimum-words'

export type RequiredSectionValidationResult = {
  type: 'required-section'
  passed: boolean
  severity: number
  data: { category: string }
}

export type CountValidationResult = {
  type: CountValidationType
  passed: boolean
  severity: number
  data: { count: number; value: number }
  // TODO: fixer function?
}

export type ValidationResult =
  | RequiredSectionValidationResult
  | CountValidationResult

export type ValidationResults = Record<string, ValidationResult>

// export type RequirementsValidator = (
//   article: ManuscriptNode,
//   modelMap: Map<string, Model>
// ) => ValidationResults
//
// export type RequirementValidator = (
//   article: ManuscriptNode,
//   modelMap: Map<string, Model>
// ) => ValidationResult | undefined
//
// export const buildRequirementsValidators = (
//   requirements: TemplateRequirements
// ): RequirementsValidator[] => {
//   const validators: RequirementValidator[] = []
//
//   requirements[ObjectTypes.MandatorySubsectionsRequirement]?.forEach(
//     (requirement) => {
//       const {
//         severity,
//         embeddedSectionDescriptions,
//       } = requirements as MandatorySubsectionsRequirement
//
//       for (const sectionDescription of embeddedSectionDescriptions) {
//         validators.push((node: ManuscriptNode) => {
//           if (isSectionNodeType(node.type)) {
//             const { category } = node.attrs
//
//             const text = buildText(node)
//             const wordCount = countWords(text)
//             const characterCount = countCharacters(text)
//
//             if (category && category === sectionDescription.sectionCategory) {
//               return {
//                 message: '',
//                 passed: false,
//                 severity,
//               }
//             }
//           }
//         })
//
//         validators.push((node: ManuscriptNode) => {
//           if (isSectionNodeType(node.type)) {
//             const { category } = node.attrs
//
//             if (category && category === sectionDescription.sectionCategory) {
//               const text = buildText(node)
//               const wordCount = countWords(text)
//               const characterCount = countCharacters(text)
//
//               return {
//                 message: '',
//                 passed: false,
//                 severity,
//               }
//             }
//           }
//         })
//       }
//     }
//   )
//   return validators
// }

export type RequiredSections = Array<{
  category: string
  severity: number
}>

export const buildRequiredSections = (
  requirements: TemplateRequirements
): RequiredSections => {
  const requiredSections: RequiredSections = []

  requirements[ObjectTypes.MandatorySubsectionsRequirement]?.forEach(
    (requirement) => {
      const {
        severity,
        embeddedSectionDescriptions,
      } = requirement as MandatorySubsectionsRequirement

      for (const sectionDescription of embeddedSectionDescriptions) {
        if (sectionDescription.required) {
          requiredSections.push({
            category: sectionDescription.sectionCategory,
            severity,
          })
        }
      }
    }
  )

  return requiredSections
}

export type CountRequirement = { count: number; severity: number }

export type CountRequirements = {
  characters: {
    max?: CountRequirement
    min?: CountRequirement
  }
  words: {
    max?: CountRequirement
    min?: CountRequirement
  }
}

export type SectionCountRequirements = Record<string, CountRequirements>

interface CountRequirementModel extends Model {
  count?: number
  ignored?: boolean
  severity: number
}

export const buildManuscriptCountRequirements = (
  requirements: TemplateRequirements
): CountRequirements => {
  const findCountRequirement = (objectType: ObjectTypes) => {
    const objectTypeRequirements = requirements[objectType]

    if (objectTypeRequirements) {
      const [requirement] = objectTypeRequirements

      const { count, ignored, severity } = requirement as CountRequirementModel

      if (!ignored && count !== undefined) {
        return { count, severity }
      }
    }
  }

  return {
    characters: {
      max: findCountRequirement(
        ObjectTypes.MaximumManuscriptCharacterCountRequirement
      ),
      min: findCountRequirement(
        ObjectTypes.MinimumManuscriptCharacterCountRequirement
      ),
    },
    words: {
      max: findCountRequirement(
        ObjectTypes.MaximumManuscriptWordCountRequirement
      ),
      min: findCountRequirement(
        ObjectTypes.MinimumManuscriptWordCountRequirement
      ),
    },
  }
}

type SectionDescriptionCountProperty =
  | 'maxWordCount'
  | 'minWordCount'
  | 'maxKeywordCount'
  | 'minKeywordCount'
  | 'maxCharCount'
  | 'minCharCount'

export const buildSectionCountRequirements = (
  requirements: TemplateRequirements
): SectionCountRequirements => {
  const sectionCountRequirements: SectionCountRequirements = {}

  requirements[ObjectTypes.MandatorySubsectionsRequirement]?.forEach(
    (requirement) => {
      const {
        ignored,
        severity,
        embeddedSectionDescriptions,
      } = requirement as MandatorySubsectionsRequirement

      if (ignored) {
        return
      }

      for (const sectionDescription of embeddedSectionDescriptions) {
        const getCountRequirement = (
          key: SectionDescriptionCountProperty
        ): CountRequirement | undefined => {
          const count = sectionDescription[key]

          if (count !== undefined) {
            return { count, severity }
          }
        }

        sectionCountRequirements[sectionDescription.sectionCategory] = {
          characters: {
            max: getCountRequirement('maxCharCount'),
            min: getCountRequirement('minCharCount'),
          },
          words: {
            max: getCountRequirement('maxWordCount'),
            min: getCountRequirement('minWordCount'),
          },
          // keywords: {
          //   max: getCountRequirement('maxKeywordCount'),
          //   min: getCountRequirement('minKeywordCount'),
          // },
        }
      }
    }
  )

  return sectionCountRequirements
}
