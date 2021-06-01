/*!
 * © 2021 Atypon Systems LLC
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
import { ContainedModel } from '@manuscripts/manuscript-transform'
import {
  CountValidationResult,
  FigureResolution,
  ObjectTypes,
  RequiredSectionValidationResult,
  ValidationResult,
} from '@manuscripts/manuscripts-json-schema'
import deepEqual from 'deep-equal'

import { AnyValidationResult } from './types/requirements'

export const addValidationResults = (
  modelMap: Map<string, ContainedModel>,
  results: Array<AnyValidationResult>
) => {
  clearValidationResults(modelMap)
  const ignoredValidationResult: Array<AnyValidationResult> = []
  for (const model of modelMap.values()) {
    if (isValidationResult(model) && model.ignored) {
      ignoredValidationResult.push(model)
    }
  }
  return (result: AnyValidationResult | undefined) => {
    if (result && !isIgnored(result, ignoredValidationResult)) {
      results.push(result)
    }
  }
}

const isValidationResult = (
  model: ContainedModel
): model is ValidationResult => {
  return 'passed' in model && 'severity' in model && 'ignored' in model
}

export const clearValidationResults = (
  modelMap: Map<string, ContainedModel>
) => {
  for (const [id, model] of modelMap) {
    if (isValidationResult(model)) {
      if (!model.ignored) {
        modelMap.delete(id)
      }
    }
  }

  return modelMap
}

const isIgnored = (
  result: AnyValidationResult,
  ignoredValidationResult: Array<AnyValidationResult>
): boolean => {
  const ignoredModels = ignoredValidationResult.filter(
    (model) => model.objectType === result.objectType
  )

  const isTheSameModel = <T>(
    ignoredModels: Array<T>,
    compare: (ignoredModel: T) => boolean
  ): boolean => {
    for (const model of ignoredModels) {
      if (compare(model as T)) {
        return true
      }
    }
    return false
  }

  switch (result.objectType) {
    case ObjectTypes.RequiredSectionValidationResult: {
      const value = result as RequiredSectionValidationResult
      return isTheSameModel(
        ignoredModels as Array<RequiredSectionValidationResult>,
        (ignoredModel) =>
          deepEqual(value.data, ignoredModel.data, { strict: true })
      )
    }
    case ObjectTypes.CountValidationResult: {
      const value = result as CountValidationResult
      return isTheSameModel(
        ignoredModels as Array<CountValidationResult>,
        (ignoredModel) =>
          value.type === ignoredModel.type &&
          value.affectedElementId === ignoredModel.affectedElementId
      )
    }
    case ObjectTypes.FigureResolution: {
      const value = result as FigureResolution
      return isTheSameModel(
        ignoredModels as Array<FigureResolution>,
        (ignoredModel) =>
          value.type === ignoredModel.type &&
          value.affectedElementId === ignoredModel.affectedElementId
      )
    }
    case ObjectTypes.KeywordsOrderValidationResult:
    case ObjectTypes.SectionOrderValidationResult: {
      type OrderType = {
        type: string
        data: { order: Array<string> }
      }
      const { data, type } = result as OrderType
      return isTheSameModel(
        ignoredModels as Array<OrderType>,
        (ignoredModel) =>
          type === ignoredModel.type &&
          deepEqual(data.order, ignoredModel.data.order)
      )
    }
    case ObjectTypes.FigureImageValidationResult:
    case ObjectTypes.SectionBodyValidationResult:
    case ObjectTypes.SectionTitleValidationResult:
    case ObjectTypes.SectionCategoryValidationResult:
    case ObjectTypes.BibliographyValidationResult:
    case ObjectTypes.FigureFormatValidationResult: {
      type Common = {
        affectedElementId: string
        type: string
      }
      const { affectedElementId, type } = result as Common
      return isTheSameModel(
        ignoredModels as Array<Common>,
        (ignoredModel) =>
          ignoredModel.affectedElementId === affectedElementId &&
          type === ignoredModel.type
      )
    }
    default:
      return false
  }
}
