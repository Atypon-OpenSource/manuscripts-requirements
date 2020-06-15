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

import { ManuscriptNode, nodeNames } from '@manuscripts/manuscript-transform'
import {
  CountRequirement,
  Manuscript,
  Model,
  Section,
} from '@manuscripts/manuscripts-json-schema'

import { buildText } from './statistics'

export interface NodeStatistics {
  text: string
  words: number
  characters: number
}

export interface RequirementResult {
  message: string
  passed?: boolean
}

export interface RequirementsAlerts {
  words_maximum?: RequirementResult
  words_minimum?: RequirementResult
  characters_maximum?: RequirementResult
  characters_minimum?: RequirementResult
}

export const findModelFromNode = (
  node: ManuscriptNode,
  modelMap: Map<string, Model>
): Manuscript | Section => {
  const { id } = node.attrs

  if (!id) {
    throw new Error('Node has no id')
  }

  const model = modelMap.get(id)

  if (!model) {
    throw new Error('Model not found')
  }

  return model as Manuscript | Section
}

export type RequirementsValidator = (
  node: ManuscriptNode,
  model: Manuscript | Section,
  statistics?: NodeStatistics
) => Promise<RequirementsAlerts>

export const createRequirementsValidator = (
  modelMap: Map<string, Model>,
  analyzers: {
    countWords: (text: string) => number
    countCharacters: (text: string) => number
  }
): RequirementsValidator => async (node, model, statistics) => {
  const output: RequirementsAlerts = {}

  const getActiveRequirementCount = (id?: string) => {
    if (!id) {
      return undefined
    }

    const requirement = modelMap.get(id) as CountRequirement | undefined

    if (!requirement) {
      return undefined
    }

    if (requirement.ignored) {
      return undefined
    }

    return requirement.count
  }

  const requirements = {
    words: {
      minimum: getActiveRequirementCount(model.minWordCountRequirement),
      maximum: getActiveRequirementCount(model.maxWordCountRequirement),
    },
    characters: {
      minimum: getActiveRequirementCount(model.minCharacterCountRequirement),
      maximum: getActiveRequirementCount(model.maxCharacterCountRequirement),
    },
  }

  const hasWordsRequirement =
    requirements.words.maximum || requirements.words.minimum

  const hasCharactersRequirement =
    requirements.characters.maximum || requirements.characters.minimum

  const hasAnyRequirement = hasWordsRequirement || hasCharactersRequirement

  if (hasAnyRequirement) {
    const nodeTypeName = nodeNames.get(node.type)
    const nodeName = nodeTypeName ? nodeTypeName.toLowerCase() : node.type.name

    const text = statistics ? statistics.text : buildText(node)

    if (hasWordsRequirement) {
      const count = statistics
        ? statistics.words
        : await analyzers.countWords(text)

      const { maximum, minimum } = requirements.words

      if (maximum !== undefined) {
        output.words_maximum = {
          message: `The ${nodeName} should have a maximum of ${maximum.toLocaleString()} words`,
          passed: count <= maximum,
        }
      }

      if (minimum !== undefined) {
        output.words_minimum = {
          message: `The ${nodeName} should have a minimum of ${minimum.toLocaleString()} words`,
          passed: count >= minimum,
        }
      }
    }

    if (hasCharactersRequirement) {
      const count = statistics
        ? statistics.characters
        : await analyzers.countCharacters(text)

      const { maximum, minimum } = requirements.characters

      if (maximum !== undefined) {
        output.characters_maximum = {
          message: `The ${nodeName} should have a maximum of ${maximum.toLocaleString()} characters`,
          passed: count <= maximum,
        }
      }

      if (minimum !== undefined) {
        output.characters_minimum = {
          message: `The ${nodeName} should have a minimum of ${minimum.toLocaleString()} characters`,
          passed: count >= minimum,
        }
      }
    }
  }

  return output
}
