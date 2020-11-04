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
import { Build, ManuscriptNode } from '@manuscripts/manuscript-transform'
import {
  BibliographyValidationResult,
  CountValidationResult,
  FigureFormatValidationResult,
  FigureImageValidationResult,
  KeywordsOrderValidationResult,
  Model,
  ObjectTypes,
  RequiredSectionValidationResult,
  Section,
  SectionBodyValidationResult,
  SectionCategoryValidationResult,
  SectionDescription,
  SectionOrderValidationResult,
  SectionTitleValidationResult,
} from '@manuscripts/manuscripts-json-schema'

export type TemplateRequirements = Partial<Record<ObjectTypes, Model[]>>

export type CountValidationType =
  | 'manuscript-maximum-characters'
  | 'manuscript-minimum-characters'
  | 'manuscript-maximum-words'
  | 'manuscript-minimum-words'
  | 'section-maximum-characters'
  | 'section-minimum-characters'
  | 'section-maximum-words'
  | 'section-minimum-words'
  | 'manuscript-title-maximum-characters'
  | 'manuscript-title-minimum-characters'
  | 'manuscript-title-maximum-words'
  | 'manuscript-title-minimum-words'
  | 'manuscript-maximum-figures'
  | 'manuscript-maximum-tables'
  | 'manuscript-maximum-combined-figure-tables'
  | 'manuscript-maximum-references'
  | 'figure-minimum-width-resolution'
  | 'figure-minimum-height-resolution'
  | 'figure-maximum-width-resolution'
  | 'figure-maximum-height-resolution'

export type FigureValidationType = 'figure-format-validation'

export type AnyValidationResult =
  | Build<RequiredSectionValidationResult>
  | Build<CountValidationResult>
  | Build<FigureFormatValidationResult>
  | Build<SectionTitleValidationResult>
  | Build<SectionOrderValidationResult>
  | Build<SectionBodyValidationResult>
  | Build<SectionCategoryValidationResult>
  | Build<BibliographyValidationResult>
  | Build<KeywordsOrderValidationResult>
  | Build<FigureImageValidationResult>
export type RequiredSections = Array<{
  sectionDescription: SectionDescription
  severity: number
}>

export type CountRequirement = { count: number | undefined; severity: number }

export type CountRequirements = {
  characters: {
    max?: CountRequirement
    min?: CountRequirement
  }
  words: {
    max?: CountRequirement
    min?: CountRequirement
  }
  title?: {
    max?: CountRequirement
    min?: CountRequirement
  }
}

export type FigureCountRequirements = {
  figures: {
    max?: CountRequirement
  }
}

export type CombinedFigureTableCountRequirements = {
  combinedFigureTable: {
    max?: CountRequirement
  }
}

export type TableCountRequirements = {
  tables: {
    max?: CountRequirement
  }
}

export type SectionCountRequirements = Record<string, CountRequirements>

export type SectionTitleRequirement = {
  title: string
  severity: number
  category: string
}

export type SectionWithTitle = {
  title: string
  id: string
}
export interface CountRequirementModel extends Model {
  count?: number
  ignored?: boolean
  severity: number
}

export type SectionDescriptionCountProperty =
  | 'maxWordCount'
  | 'minWordCount'
  | 'maxKeywordCount'
  | 'minKeywordCount'
  | 'maxCharCount'
  | 'minCharCount'

export interface Counts {
  words: number
  characters: number
}

export type ReferenceCountRequirements = {
  references: {
    max?: CountRequirement
  }
}

export type Sections = Map<
  string,
  Array<{ node: ManuscriptNode; counts: Counts; section: Section }>
>

export type FigureResolutionsRequirements = {
  max: {
    width?: CountRequirement
    height?: CountRequirement
  }
  min: {
    width?: CountRequirement
    height?: CountRequirement
  }
}
