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
  if (result.passed) {
    return
  }
  switch (result.type) {
    case 'bibliography-doi-exist':
      // Add the citation text?
      return `DOI is required`

    case 'bibliography-doi-format':
      return `Incorrect DOI format`

    case 'required-section': {
      return `There must be ${getSectionName(
        result.data.sectionCategory
      )} section`
    }

    case 'manuscript-maximum-characters':
      return `The manuscript must have less than or equal to ${result.data.value} characters`

    case 'manuscript-minimum-characters':
      return `The manuscript must have more than or equal to ${result.data.value} characters`

    case 'manuscript-maximum-words':
      return `The manuscript must have less than or equal to ${result.data.value} words`

    case 'manuscript-minimum-words':
      return `The manuscript must have more than or equal to ${result.data.value} words`

    case 'manuscript-maximum-figures':
      return `The manuscript must have less than or equal to ${result.data.value} figures`

    case 'manuscript-maximum-references':
      return `The manuscript must have less than or equal to ${result.data.value} references`

    case 'manuscript-maximum-tables':
      return `The manuscript must have less than or equal to ${result.data.value} tables`

    case 'manuscript-maximum-corresponding-authors':
      return `The manuscript must have less than or equal to ${result.data.value} corresponding authors`

    case 'section-maximum-characters': {
      const name = getSectionName(result.data.sectionCategory)
      return `${name} must have less than or equal to ${result.data.value} characters`
    }

    case 'section-minimum-characters': {
      const name = getSectionName(result.data.sectionCategory)
      return `${name} must have more than or equal to ${result.data.value} characters`
    }

    case 'section-maximum-words': {
      const name = getSectionName(result.data.sectionCategory)
      return `${name} must have less than or equal to ${result.data.value} words`
    }

    case 'section-minimum-words': {
      const name = getSectionName(result.data.sectionCategory)
      return `${name} must have more than or equal to ${result.data.value} words`
    }

    case 'section-maximum-paragraphs': {
      const name = getSectionName(result.data.sectionCategory)
      return `${name} must have less than or equal to ${result.data.value} paragraphs`
    }

    case 'manuscript-title-maximum-characters':
      return `The manuscript title must have less than or equal to ${result.data.value} characters`

    case 'manuscript-title-minimum-characters':
      return `The manuscript title must have more than or equal to ${result.data.value} characters`

    case 'manuscript-title-maximum-words':
      return `The manuscript title must have less than or equal to ${result.data.value} words`

    case 'manuscript-title-minimum-words':
      return `The manuscript title must have more than or equal to ${result.data.value} words`

    case 'manuscript-running-title-maximum-characters':
      return `The manuscript running title must have less than or equal to ${result.data.value} characters`

    case 'figure-contains-image':
      return `Image in figure is missing`

    case 'figure-format-validation':
      return `${result.data.contentType} format is not allowed`

    case 'figure-maximum-height-resolution':
      return `Figure height must be less than or equal to ${result.data.value}`

    case 'figure-minimum-height-resolution':
      return `Figure height must be greater than or equal to ${result.data.value}`

    case 'figure-maximum-width-resolution':
      return `Figure width must be less than or equal to ${result.data.value}`

    case 'figure-minimum-width-resolution':
      return `Figure width must be greater than or equal to ${result.data.value}`

    case 'keywords-order':
      return 'Keywords must be listed in alphabetical order'

    case 'section-order': {
      const order = result.data.order as Array<string>
      const sections = order.map(getSectionName).join(', ')
      return `Sections must be listed in the following order ${sections}`
    }

    case 'section-body-has-content': {
      const name = getSectionName(result.data.sectionCategory)
      return `${name} section must contains content`
    }

    case 'section-category-uniqueness': {
      const name = getSectionName(result.data.sectionCategory)
      return `Cannot have more than one ${name} section in the same scope`
    }

    case 'section-title-match': {
      const { requiredTitle, sectionCategory } = result.data
      const name = getSectionName(sectionCategory)
      return `Title for ${name} section should be ${requiredTitle}`
    }

    case 'section-title-contains-content': {
      const name = getSectionName(result.data.sectionCategory)
      return `${name} title cannot be empty`
    }

    default:
      return 'Requirement did not pass'
  }
}
