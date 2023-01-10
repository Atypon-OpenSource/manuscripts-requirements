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
  Citation,
  Contributor,
  ObjectTypes,
  RequiredSectionValidationResult,
  Section,
} from '@manuscripts/json-schema'
import {
  ContainedModel,
  Decoder,
  getModelsByType,
  hasObjectType,
  isManuscript,
  ManuscriptNode,
  timestamp,
} from '@manuscripts/transform'
import { fileTypeFromBuffer } from 'file-type'
import { types as imageTypes } from 'image-size'
import { v4 as uuid } from 'uuid'

import { InputError } from './errors'
import { AnyValidationResult, RequiredSections } from './types/requirements'
export const isSection = hasObjectType<Section>(ObjectTypes.Section)

export const findModelByID = (
  data: ContainedModel[],
  id: string
): ContainedModel | undefined => data.find((model) => model._id === id)

export const nextPriority = (data: Array<ContainedModel>): number => {
  const priorities = data.filter(isSection).map((section) => section.priority)
  return Math.max(...priorities, 0) + 1
}

// Returns manuscripts title or an empty string if one is not defined
export const getManuscriptTitle = (
  modelMap: Map<string, ContainedModel>,
  manuscriptId: string
): string => {
  const model = modelMap.get(manuscriptId)

  return model && isManuscript(model) ? model.title || '' : ''
}

export const countModelsByType = (
  modelMap: Map<string, ContainedModel>,
  objectType: ObjectTypes
): number => getModelsByType(modelMap, objectType).length

export const getSectionScope = (section: Section): string =>
  section.path.filter((el) => el !== section._id).join()

export const getFigureFormat = (contentType: string): string | undefined => {
  switch (contentType) {
    case 'image/jpeg':
      return 'jpeg'
    case 'image/png':
      return 'png'
    case 'image/tiff':
      return 'tiff'
    default:
      return undefined
  }
}

export const getReferences = (
  modelMap: Map<string, ContainedModel>
): Array<string> => {
  const references = new Set<string>()
  modelMap.forEach((model) => {
    if (model.objectType == ObjectTypes.Citation) {
      const citation = model as Citation
      citation.embeddedCitationItems.forEach((citationItem) =>
        references.add(citationItem.bibliographyItem)
      )
    }
  })
  return [...references]
}

export const hasRightOrder = (
  requiredOrder: Array<string>,
  currentOrder: Array<string>
): boolean => {
  if (requiredOrder.length !== currentOrder.length) {
    return false
  }
  for (let i = 0; i < requiredOrder.length; i++) {
    if (requiredOrder[i].trim() !== currentOrder[i].trim()) {
      return false
    }
  }
  return true
}
export const isSequential = (arr: Array<number>): boolean => {
  const sortedNumbers = arr.sort()
  if (arr.length <= 1) {
    return true
  }
  let previous = sortedNumbers[0] - 1
  for (const current of sortedNumbers) {
    if (current - previous !== 1) {
      return false
    }
    previous = current
  }
  return true
}
export const sortSections = (requiredSections: RequiredSections) => {
  return requiredSections
    .map((el) => el.sectionDescription)
    .sort((sectionOne, sectionTwo) => {
      const p1 = sectionOne.priority || 0
      const p2 = sectionTwo.priority || 0
      return p1 - p2
    })
}

export const createArticle = (
  data: ContainedModel[],
  manuscriptID: string
): {
  article: ManuscriptNode
  decoder: Decoder
  modelMap: Map<string, ContainedModel>
  manuscriptModels: ContainedModel[]
} => {
  const manuscriptModels = data.filter(
    // @ts-ignore
    (model) => !model.manuscriptID || model.manuscriptID === manuscriptID
  )

  const modelMap = new Map<string, ContainedModel>(
    manuscriptModels.map((model) => [model._id, model])
  )

  const decoder = new Decoder(modelMap)

  const article = decoder.createArticleNode(manuscriptID)

  return { article, decoder, modelMap, manuscriptModels }
}

const VALID_DOI_REGEX = /^(https:\/\/doi.org\/)?10\..+\/.+/
export const isValidDOI = (doi: string): boolean => VALID_DOI_REGEX.test(doi)

export const getFigure = async (
  id: string,
  getData: (id: string) => Promise<Buffer>
): Promise<Buffer> => {
  const figure = await getData(id)
  if (!Buffer.isBuffer(figure)) {
    throw new InputError(`Figure for ${id} must be a buffer`)
  }
  const fileType = await fileTypeFromBuffer(figure)
  if (!fileType) {
    throw new InputError(`Unknown file type for ${id}`)
  }
  if (!imageTypes.includes(fileType.ext)) {
    throw new InputError(`Unsupported file type for ${id}`)
  }
  return figure
}

export const createRequiredModelProperties = (
  manuscriptID: string,
  containerID: string,
  sessionID = uuid()
) => {
  const createdAt = timestamp()
  return {
    containerID,
    manuscriptID,
    createdAt,
    updatedAt: createdAt,
    sessionID,
  }
}

export const findContributors = (
  manuscriptID: string,
  manuscriptData: Array<ContainedModel>
) => {
  const contributors = manuscriptData.filter(
    (model) => model.objectType === ObjectTypes.Contributor
  ) as Array<Contributor>

  return contributors.filter(
    (contributor) => contributor.manuscriptID === manuscriptID
  )
}

export const findModelsByType = (
  modelMap: Map<string, ContainedModel>,
  type: string
): Array<ContainedModel> => [...modelMap.values()].filter(hasObjectType(type))

export const manuscriptHasMissingSection = (
  modelMap: Map<string, ContainedModel>,
  validationResults: Array<AnyValidationResult>
) => {
  const hasMissingSection =
    validationResults.filter(
      (el) => el.type === 'required-section' && !el.passed
    ).length > 0

  const hasAnIgnoredMissingSection = findModelsByType(
    modelMap,
    ObjectTypes.RequiredSectionValidationResult
  ).filter((model) => {
    const requiredSectionValidation = model as RequiredSectionValidationResult
    return (
      requiredSectionValidation.ignored && !requiredSectionValidation.passed
    )
  })

  return hasMissingSection || hasAnIgnoredMissingSection
}
