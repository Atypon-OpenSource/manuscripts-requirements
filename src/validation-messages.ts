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
import sectionCategories from '@manuscripts/data/dist/shared/section-categories.json'
import { SectionCategory } from '@manuscripts/manuscripts-json-schema'

import { AnyValidationResult } from './types/requirements'

const sectionCategoriesMap = new Map<string, SectionCategory>(
  (sectionCategories as Array<SectionCategory>).map((section) => [
    section._id,
    section,
  ])
)

const getSectionName = (sectionCategory: string | undefined) => {
  if (!sectionCategory) {
    return 'Section'
  }
  const category = sectionCategoriesMap.get(sectionCategory)
  if (category) {
    return category.name
  } else {
    throw new Error(`${sectionCategory} not found in sections categories`)
  }
}

export const appendValidationMessages = (results: Array<AnyValidationResult>) =>
  results.map((result) => ({ ...result, message: validationMessage(result) }))

export const validationMessage = (
  result: AnyValidationResult
): string | undefined => {
  const userMessage = (valid: string, invalid = valid) => {
    return result.passed ? valid : invalid
  }
  switch (result.type) {
    case 'bibliography-doi-exist':
      return userMessage(
        `DOI included for bibliographic references`,
        `DOI is required for bibliographic references`
      )

    case 'bibliography-doi-format':
      return userMessage(
        `DOI format for bibliographic references is correct`,
        `Incorrect DOI format for a bibliographic reference`
      )

    case 'required-section': {
      return userMessage(
        `There must exist a "${getSectionName(
          result.data.sectionCategory
        )}" section`,
        `There must exist a "${getSectionName(
          result.data.sectionCategory
        )}" section`
      )
    }

    case 'manuscript-maximum-characters':
      return userMessage(
        `The manuscript has less than or equal to ${result.data.value} characters`,
        `The manuscript must have less than or equal to ${result.data.value} characters`
      )

    case 'manuscript-minimum-characters':
      return userMessage(
        `The manuscript has more than or equal to ${result.data.value} characters`,
        `The manuscript must have more than or equal to ${result.data.value} characters`
      )

    case 'manuscript-maximum-words':
      return userMessage(
        `The manuscript has less than or equal to ${result.data.value} words`,
        `The manuscript must have less than or equal to ${result.data.value} words`
      )

    case 'manuscript-minimum-words':
      return userMessage(
        `The manuscript has more than or equal to ${result.data.value} words`,
        `The manuscript must have more than or equal to ${result.data.value} words`
      )

    case 'manuscript-maximum-figures':
      return userMessage(
        `The manuscript has less than or equal to ${result.data.value} figures`,
        `The manuscript must have less than or equal to ${result.data.value} figures`
      )

    case 'manuscript-maximum-references':
      return userMessage(
        `The manuscript has less than or equal to ${result.data.value} references`,
        `The manuscript must have less than or equal to ${result.data.value} references`
      )

    case 'manuscript-maximum-tables':
      return userMessage(
        `The manuscript has less than or equal to ${result.data.value} tables`,
        `The manuscript must have less than or equal to ${result.data.value} tables`
      )

    case 'manuscript-maximum-corresponding-authors':
      return userMessage(
        `The manuscript has less than or equal to ${result.data.value} corresponding authors`,
        `The manuscript must have less than or equal to ${result.data.value} corresponding authors`
      )

    case 'section-maximum-characters': {
      const name = getSectionName(result.data.sectionCategory)
      return userMessage(
        `"${name}" has less than or equal to ${result.data.value} characters`,
        `"${name}" must have less than or equal to ${result.data.value} characters`
      )
    }

    case 'section-minimum-characters': {
      const name = getSectionName(result.data.sectionCategory)
      return userMessage(
        `"${name}" has more than or equal to ${result.data.value} characters`,
        `"${name}" must have more than or equal to ${result.data.value} characters`
      )
    }

    case 'section-maximum-words': {
      const name = getSectionName(result.data.sectionCategory)
      return userMessage(
        `"${name}" has less than or equal to ${result.data.value} words`,
        `"${name}" must have less than or equal to ${result.data.value} words`
      )
    }

    case 'section-minimum-words': {
      const name = getSectionName(result.data.sectionCategory)
      return userMessage(
        `"${name}" has more than or equal to ${result.data.value} words`,
        `"${name}" must have more than or equal to ${result.data.value} words`
      )
    }

    case 'section-maximum-paragraphs': {
      const name = getSectionName(result.data.sectionCategory)
      return userMessage(
        `"${name}" has less than or equal to ${result.data.value} paragraphs`,
        `"${name}" must have less than or equal to ${result.data.value} paragraphs`
      )
    }

    case 'manuscript-title-maximum-characters':
      return userMessage(
        `The manuscript title has less than or equal to ${result.data.value} characters`,
        `The manuscript title must have less than or equal to ${result.data.value} characters`
      )

    case 'manuscript-title-minimum-characters':
      return userMessage(
        `The manuscript title has more than or equal to ${result.data.value} characters`,
        `The manuscript title must have more than or equal to ${result.data.value} characters`
      )

    case 'manuscript-title-maximum-words':
      return userMessage(
        `The manuscript title has less than or equal to ${result.data.value} words`,
        `The manuscript title must have less than or equal to ${result.data.value} words`
      )

    case 'manuscript-title-minimum-words':
      return userMessage(
        `The manuscript title has more than or equal to ${result.data.value} words`,
        `The manuscript title must have more than or equal to ${result.data.value} words`
      )

    case 'manuscript-running-title-maximum-characters':
      return userMessage(
        `The manuscript running title has less than or equal to ${result.data.value} characters`,
        `The manuscript running title must have less than or equal to ${result.data.value} characters`
      )

    case 'figure-contains-image':
      return userMessage(
        `Image data for figure is included`,
        `Image data for figure is missing`
      )

    case 'figure-format-validation': {
      const contentType = result.data.contentType
      const contentTypeFormatted = contentType
        .substring(contentType.indexOf('/') + 1)
        .toUpperCase()
      const allowedImageTypes = result.data.allowedImageTypes.map(function (
        type
      ) {
        return type.toUpperCase()
      })
      return userMessage(
        `Required image file format (${contentTypeFormatted})`,
        `${contentTypeFormatted} format is not allowed, allowed formats (${allowedImageTypes})`
      )
    }

    case 'figure-maximum-height-resolution': {
      if (result.data.dpi !== undefined) {
        const figureCm = (result.data.value * 2.54) / result.data.dpi
        return userMessage(
          `Figure height is less than or equal to ${figureCm}cm tall at ${result.data.dpi}DPI (${result.data.value}px)`,
          `Figure height must be less than or equal to ${figureCm}cm tall at ${result.data.dpi}DPI (${result.data.value}px)`
        )
      } else {
        return userMessage(
          `Figure height is less than or equal to (${result.data.value}px)`,
          `Figure height must be less than or equal to (${result.data.value}px)`
        )
      }
    }

    case 'figure-minimum-height-resolution': {
      if (result.data.dpi !== undefined) {
        const figureCm = (result.data.value * 2.54) / result.data.dpi
        return userMessage(
          `Figure height is greater than or equal to ${figureCm}cm tall at ${result.data.dpi}DPI (${result.data.value}px)`,
          `Figure height must be greater than or equal to ${figureCm}cm tall at ${result.data.dpi}DPI (${result.data.value}px)`
        )
      } else {
        return userMessage(
          `Figure height is greater than or equal to (${result.data.value}px)`,
          `Figure height must be greater than or equal to (${result.data.value}px)`
        )
      }
    }

    case 'figure-maximum-width-resolution': {
      if (result.data.dpi !== undefined) {
        const figureCm = (result.data.value * 2.54) / result.data.dpi
        return userMessage(
          `Figure width is less than or equal to ${figureCm}cm wide at ${result.data.dpi}DPI (${result.data.value}px)`,
          `Figure width must be less than or equal to ${figureCm}cm wide at ${result.data.dpi}DPI (${result.data.value}px)`
        )
      } else {
        return userMessage(
          `Figure width is less than or equal to (${result.data.value}px)`,
          `Figure width must be less than or equal (${result.data.value}px)`
        )
      }
    }

    case 'figure-minimum-width-resolution': {
      if (result.data.dpi !== undefined) {
        const figureCm = (result.data.value * 2.54) / result.data.dpi
        return userMessage(
          `Figure width is greater than or equal to ${figureCm}cm wide at ${result.data.dpi}DPI (${result.data.value}px)`,
          `Figure width must be greater than or equal to ${figureCm}cm wide at ${result.data.dpi}DPI (${result.data.value}px)`
        )
      } else {
        return userMessage(
          `Figure width is greater than or equal to (${result.data.value}px)`,
          `Figure width must be greater than or equal to (${result.data.value}px)`
        )
      }
    }

    case 'keywords-order':
      return userMessage(
        'Keywords are listed in alphabetical order',
        'Keywords must be listed in alphabetical order'
      )

    case 'section-order': {
      const order = result.data.order as Array<string>
      const sections = order.map(getSectionName).join(', ')
      return userMessage(
        `Sections are listed in the correct order ${sections}`,
        `Sections must be listed in the following order: "${sections}"`
      )
    }

    case 'section-body-has-content': {
      const name = getSectionName(result.data.sectionCategory)
      const title =
        result.data.sectionCategory == 'MPSectionCategory:bibliography' &&
        result.data.sectionTitle
          ? result.data.sectionTitle
          : name
      return userMessage(
        `"${title}" section has content (is not empty)`,
        `"${title}" section must not be empty`
      )
    }

    case 'section-category-uniqueness': {
      const name = getSectionName(result.data.sectionCategory)
      return userMessage(
        `The scope has at most one "${name}" section`,
        `Cannot have more than one "${name}" section in the same scope`
      )
    }

    case 'section-title-match': {
      const { title, sectionCategory } = result.data
      const name = getSectionName(sectionCategory)
      return userMessage(
        `Title for "${title}" is correct`,
        `Title for "${name}" section should be "${title}"`
      )
    }

    case 'section-title-contains-content': {
      const name = getSectionName(result.data.sectionCategory)
      return userMessage(
        `"${name}" title has content (is not empty)`,
        `"${name}" title cannot be empty`
      )
    }

    default:
      return userMessage('Requirement passed', 'Requirement did not pass')
  }
}
