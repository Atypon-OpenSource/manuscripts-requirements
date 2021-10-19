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
  Build,
  ContainedModel,
  generateID,
  getModelsByType,
  isBibliographySectionNode,
  isKeywordsSectionNode,
  isManuscript,
  isSectionNode,
  isTOCSectionNode,
  ManuscriptNode,
} from '@manuscripts/manuscript-transform'
import {
  BibliographyItem,
  BibliographyValidationResult,
  Contributor,
  CountValidationResult,
  Figure,
  FigureFormatValidationResult,
  FigureImageValidationResult,
  FigureResolution,
  KeywordsOrderValidationResult,
  Manuscript,
  ManuscriptKeyword,
  ManuscriptTemplate,
  ObjectTypes,
  RequiredSectionValidationResult,
  Section,
  SectionBodyValidationResult,
  SectionCategoryValidationResult,
  SectionOrderValidationResult,
  SectionTitleValidationResult,
} from '@manuscripts/manuscripts-json-schema'
import { imageSize } from 'image-size'

import { InputError } from './errors'
import {
  buildCombinedFigureTableCountRequirements,
  buildContributorsCountRequirements,
  buildFigureCountRequirements,
  buildManuscriptCountRequirements,
  buildManuscriptReferenceCountRequirements,
  buildRequiredSections,
  buildRunningTitleCountRequirements,
  buildSectionCountRequirements,
  buildSectionTitleRequirements,
  buildTableCountRequirements,
  buildTitleCountRequirements,
  getAllowedFigureFormats,
  getAllowedFigureResolution,
} from './requirements'
import { addValidationResults } from './result-filter'
import { buildText, countCharacters, countWords } from './statistics'
import { sectionCategoriesMap } from './templates'
import { GetData, validationOptions } from './types/input'
import {
  AnyValidationResult,
  CombinedFigureTableCountRequirements,
  ContributorsCountRequirement,
  CountRequirement,
  CountRequirements,
  Counts,
  CountValidationType,
  FigureCountRequirements,
  FigureResolutionsRequirements,
  FigureResolutionsType,
  FigureValidationType,
  ReferenceCountRequirements,
  RequiredSections,
  RunningTitleRequirement,
  SectionCountRequirements,
  Sections,
  SectionTitleRequirement,
  TableCountRequirements,
} from './types/requirements'
import {
  countModelsByType,
  createArticle,
  findContributors,
  findModelByID,
  getFigure,
  getFigureFormat,
  getManuscriptTitle,
  getReferences,
  getSectionScope,
  hasRightOrder,
  isSequential,
  isValidDOI,
  manuscriptHasMissingSection,
  sortSections,
} from './utils'
import { appendValidationMessages } from './validation-messages'

const iterateChildren = function* (
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

const buildSections = async (
  article: ManuscriptNode,
  modelMap: Map<string, ContainedModel>,
  recurse = false
): Promise<Sections> => {
  const output: Sections = new Map()
  const findSectionCategory = (node: ManuscriptNode) => {
    if (isSectionNode(node)) {
      return node.attrs.category
    } else if (isKeywordsSectionNode(node)) {
      return 'MPSectionCategory:keywords'
    } else if (isBibliographySectionNode(node)) {
      return 'MPSectionCategory:bibliography'
    } else if (isTOCSectionNode(node)) {
      return 'MPSectionCategory:toc'
    }
  }

  const findNumberOfParagraphs = (section: Section): number =>
    section.elementIDs?.filter((id) => {
      const manuscriptModel = modelMap.get(id)
      return (
        manuscriptModel &&
        manuscriptModel.objectType === ObjectTypes.ParagraphElement
      )
    }).length || 0

  for (const node of iterateChildren(article, recurse)) {
    const category = findSectionCategory(node)
    if (category) {
      const { id } = node.attrs
      const sections = output.get(category) || []

      const text = buildText(node)
      const section = modelMap.get(id) as Section

      const counts = {
        characters: await countCharacters(text),
        words: await countWords(text),
        paragraphs: findNumberOfParagraphs(section),
      }

      sections.push({ node, counts, section })

      output.set(category, sections)
    }
  }

  return output
}

const validateSectionsCategory = async function* (
  sectionsWithCategory: Sections
): AsyncGenerator<Build<SectionCategoryValidationResult>> {
  for (const [dataCategory, dataSections] of sectionsWithCategory) {
    const category = sectionCategoriesMap.get(dataCategory)
    if (category && category.uniqueInScope) {
      const scopes = new Set()
      for (const { section } of dataSections) {
        const scope = getSectionScope(section)
        if (scopes.has(scope)) {
          yield {
            ...buildValidationResult(
              ObjectTypes.SectionCategoryValidationResult
            ),
            type: 'section-category-uniqueness',
            passed: false,
            data: { sectionCategory: section.category },
            affectedElementId: section._id,
          }
        } else {
          scopes.add(scope)
        }
      }
    }
  }
}

const validateSectionBody = async function* (
  sectionsWithCategory: Sections
): AsyncGenerator<Build<SectionBodyValidationResult>> {
  for (const [, category] of sectionsWithCategory) {
    for (const { section, node } of category) {
      yield {
        ...buildValidationResult(ObjectTypes.SectionBodyValidationResult),
        type: 'section-body-has-content',
        passed: containsBodyContent(node),
        data: { sectionCategory: section.category },
        affectedElementId: section._id,
      }
    }
  }
}

export const containsBodyContent = (sectionNode: ManuscriptNode): boolean => {
  let hasContent = false
  sectionNode.descendants((childNode: ManuscriptNode) => {
    if (childNode.type && childNode.type.name) {
      const nodeType = childNode.type.name
      if (
        nodeType === 'bibliography_element' &&
        sectionNode.type.name === 'bibliography_section' &&
        childNode.attrs
      ) {
        hasContent = true
      }
      if (nodeType === 'inline_equation' || nodeType === 'equation') {
        if (childNode.attrs && childNode.attrs.TeXRepresentation) {
          hasContent = true
        }
      } else if (nodeType === 'figure_element') {
        hasContent = true
      } else if (
        nodeType !== 'section_title' &&
        childNode.isTextblock &&
        childNode.textContent.trim().length > 0
      ) {
        hasContent = true
      }
    }
  })
  return hasContent
}

const validateSectionsOrder = (
  requiredSections: RequiredSections,
  sectionsWithCategory: Sections
): Build<SectionOrderValidationResult> => {
  const requiredOrder = sortSections(requiredSections).map(
    (el) => el.sectionCategory
  )
  let passed = true
  const currentOrder = []
  for (const [category, sections] of sectionsWithCategory) {
    if (!requiredOrder.includes(category)) {
      // skip optional sections
      continue
    }
    const categoryPriorities = sections.map((el) => el.section.priority)
    if (!isSequential(categoryPriorities)) {
      // if the same category dose not come one after another in priority that means the order is not correct
      passed = false
      break
    }
    currentOrder.push(category)
  }
  if (passed) {
    passed = hasRightOrder(requiredOrder, currentOrder)
  }
  return {
    ...buildValidationResult(ObjectTypes.SectionOrderValidationResult),
    type: 'section-order',
    passed,
    data: { order: requiredOrder },
    fixable: true,
  }
}

async function* validateRequiredSections(
  requiredSections: RequiredSections,
  sectionCategories: Set<string>
): AsyncGenerator<Build<RequiredSectionValidationResult>> {
  for (const requiredSection of requiredSections) {
    const { sectionDescription, severity } = requiredSection
    const { sectionCategory } = sectionDescription
    yield {
      ...buildValidationResult(
        ObjectTypes.RequiredSectionValidationResult,
        severity
      ),
      type: 'required-section',
      passed: sectionCategories.has(sectionCategory),
      data: { sectionDescription, sectionCategory },
      fixable: true,
    }
  }
}

async function* validateSectionsTitle(
  requiredSections: Array<SectionTitleRequirement>,
  sectionCategories: Sections
): AsyncGenerator<Build<SectionTitleValidationResult>> {
  for (const requirement of requiredSections) {
    const { category } = requirement
    const sections = sectionCategories.get(category)
    if (sections) {
      for (const { section } of sections) {
        yield await validateTitleContent(requirement, section)

        const expectedTitleValidationResult = validateExpectedTitle(
          requirement,
          section
        )
        if (expectedTitleValidationResult) {
          yield expectedTitleValidationResult
        }
      }
    }
  }
}

const validateTitleContent = async (
  requirement: SectionTitleRequirement,
  section: Section
): Promise<Build<SectionTitleValidationResult>> => {
  const { title, _id, category } = section
  const passed = !!(title && title.trim().length > 0)

  return {
    ...buildValidationResult(
      ObjectTypes.SectionTitleValidationResult,
      requirement.severity
    ),
    type: 'section-title-contains-content',
    passed,
    data: { sectionCategory: category },
    affectedElementId: _id,
  }
}

const validateExpectedTitle = (
  requirement: SectionTitleRequirement,
  section: Section
): Build<SectionTitleValidationResult> | undefined => {
  const { title: sectionTitle, _id, category } = section
  const { title: requiredTitle, severity } = requirement

  if (requiredTitle) {
    return {
      ...buildValidationResult(
        ObjectTypes.SectionTitleValidationResult,
        severity
      ),
      type: 'section-title-match',
      passed: sectionTitle === requiredTitle,
      data: { title: requiredTitle, sectionCategory: category },
      fixable: true,
      affectedElementId: _id,
    }
  }
}
const validateCount = (
  type: CountValidationType,
  count: number,
  checkMax: boolean,
  requirement?: CountRequirement
): Build<CountValidationResult> | undefined => {
  if (requirement && requirement.count !== undefined) {
    const requirementCount = requirement.count
    return {
      ...buildValidationResult(ObjectTypes.CountValidationResult),
      type,
      passed: checkMax ? count <= requirementCount : count >= requirementCount,
      data: { count, value: requirementCount },
    }
  }
}

const validateFigureResolutionCount = (
  type: FigureResolutionsType,
  count: number,
  checkMax: boolean,
  template: ManuscriptTemplate,
  requirement?: CountRequirement
): Build<FigureResolution> | undefined => {
  if (requirement && requirement.count !== undefined) {
    const requirementCount = requirement.count
    let dpiValue
    if (
      template.minFigureScreenDPIRequirement !== undefined &&
      template.maxFigureScreenDPIRequirement === undefined
    ) {
      dpiValue = parseInt(template.minFigureScreenDPIRequirement)
    } else if (
      template.maxFigureScreenDPIRequirement !== undefined &&
      template.minFigureScreenDPIRequirement === undefined
    ) {
      dpiValue = parseInt(template.maxFigureScreenDPIRequirement)
    }
    return {
      ...buildValidationResult(ObjectTypes.FigureResolution),
      type,
      passed: checkMax ? count <= requirementCount : count >= requirementCount,
      data: { count, value: requirementCount, dpi: dpiValue },
    }
  }
}

const validateFigureFormat = (
  type: FigureValidationType,
  format: string | undefined,
  id: string,
  contentType: string,
  allowedFormats: Array<string>
): Build<FigureFormatValidationResult> | undefined => {
  return {
    ...buildValidationResult(ObjectTypes.FigureFormatValidationResult),
    type,
    passed: (format && allowedFormats.includes(format)) || false,
    data: { contentType, allowedImageTypes: allowedFormats },
  }
}

const validateManuscriptCounts = async function* (
  article: ManuscriptNode,
  requirements: CountRequirements
): AsyncGenerator<Build<CountValidationResult> | undefined> {
  const manuscriptText = buildText(article)

  const manuscriptCounts: Counts = {
    characters: await countCharacters(manuscriptText),
    words: await countWords(manuscriptText),
  }

  yield validateCount(
    'manuscript-maximum-characters',
    manuscriptCounts.characters,
    true,
    requirements.characters.max
  )

  yield validateCount(
    'manuscript-minimum-characters',
    manuscriptCounts.characters,
    false,
    requirements.characters.min
  )

  yield validateCount(
    'manuscript-maximum-words',
    manuscriptCounts.words,
    true,
    requirements.words.max
  )

  yield validateCount(
    'manuscript-minimum-words',
    manuscriptCounts.words,
    false,
    requirements.words.min
  )
}

const validateSectionCounts = async function* (
  sectionsWithCategory: Sections,
  sectionCountRequirements: SectionCountRequirements
) {
  const validate = (
    type: CountValidationType,
    count: number,
    checkMax: boolean,
    requirement?: CountRequirement,
    sectionCategory?: string
  ): Build<CountValidationResult> | undefined => {
    const countResult = validateCount(type, count, checkMax, requirement)
    if (countResult) {
      countResult.data.sectionCategory = sectionCategory
    }
    return countResult
  }

  for (const [category, requirements] of Object.entries(
    sectionCountRequirements
  )) {
    const records = sectionsWithCategory.get(category)

    if (records) {
      for (const item of records) {
        yield validate(
          'section-maximum-characters',
          item.counts.characters,
          true,
          requirements.characters.max,
          category
        )

        yield validate(
          'section-minimum-characters',
          item.counts.characters,
          false,
          requirements.characters.min,
          category
        )

        yield validate(
          'section-maximum-words',
          item.counts.words,
          true,
          requirements.words.max,
          category
        )

        yield validate(
          'section-minimum-words',
          item.counts.words,
          false,
          requirements.words.min,
          category
        )

        yield validate(
          'section-maximum-paragraphs',
          item.counts.paragraphs,
          true,
          requirements.paragraphs?.max,
          category
        )
      }
    }
  }
}
const validateContributorCountRequirements = function* (
  requirements: ContributorsCountRequirement,
  contributors: Array<Contributor>
) {
  const numberOfCorrespondingAuthors = contributors.filter(
    (contributor) => contributor.isCorresponding
  ).length
  yield validateCount(
    'manuscript-maximum-corresponding-authors',
    numberOfCorrespondingAuthors,
    true,
    requirements.correspondingAuthors.max
  )
}

const validateTitleCounts = async function* (
  manuscriptTitle: string,
  requirements: CountRequirements
) {
  const titleCounts: Counts = {
    words: await countWords(manuscriptTitle),
    characters: await countCharacters(manuscriptTitle),
  }

  yield validateCount(
    'manuscript-title-maximum-words',
    titleCounts.words,
    true,
    requirements.words.max
  )

  yield validateCount(
    'manuscript-title-minimum-words',
    titleCounts.words,
    false,
    requirements.words.min
  )

  yield validateCount(
    'manuscript-title-maximum-characters',
    titleCounts.characters,
    true,
    requirements.characters.max
  )

  yield validateCount(
    'manuscript-title-minimum-characters',
    titleCounts.characters,
    false,
    requirements.characters.min
  )
}

const validateRunningTitleCount = async function* (
  runningTitle: string | undefined,
  requirement: RunningTitleRequirement
) {
  if (runningTitle) {
    const runningTitleCounts = await countCharacters(runningTitle)

    yield validateCount(
      'manuscript-running-title-maximum-characters',
      runningTitleCounts,
      true,
      requirement.runningTitle.max
    )
  }
}

const validateFigureCounts = async function* (
  modelMap: Map<string, ContainedModel>,
  requirements: FigureCountRequirements
) {
  const figuresCount = countModelsByType(modelMap, ObjectTypes.Figure)

  yield validateCount(
    'manuscript-maximum-figures',
    figuresCount,
    true,
    requirements.figures.max
  )
}

const validateTableCounts = async function* (
  modelMap: Map<string, ContainedModel>,
  requirements: TableCountRequirements
) {
  const tablesCount = countModelsByType(modelMap, ObjectTypes.Table)

  yield validateCount(
    'manuscript-maximum-tables',
    tablesCount,
    true,
    requirements.tables.max
  )
}

const validateCombinedTableFigureCounts = async function* (
  modelMap: Map<string, ContainedModel>,
  requirements: CombinedFigureTableCountRequirements
) {
  const totalCount =
    countModelsByType(modelMap, ObjectTypes.Table) +
    countModelsByType(modelMap, ObjectTypes.Figure)

  yield validateCount(
    'manuscript-maximum-combined-figure-tables',
    totalCount,
    true,
    requirements.combinedFigureTable.max
  )
}

const validateReferenceCounts = async function* (
  referencesCount: number,
  requirements: ReferenceCountRequirements
) {
  yield validateCount(
    'manuscript-maximum-references',
    referencesCount,
    true,
    requirements.references.max
  )
}

const validateBibliography = async function* (
  modelMap: Map<string, ContainedModel>,
  references: Array<string>
): AsyncGenerator<Build<BibliographyValidationResult>> {
  for (const reference of references) {
    const model = modelMap.get(reference)
    if (model) {
      const bibliographyItem = model as BibliographyItem
      const results = validateDOI(bibliographyItem)
      for (const result of results) {
        yield result
      }
    } else {
      throw new Error(`${reference} not found in manuscript data`)
    }
  }
}

const validateDOI = function (
  bibliographyItem: BibliographyItem
): Array<Build<BibliographyValidationResult>> {
  const result: Array<Build<BibliographyValidationResult>> = []
  const { DOI } = bibliographyItem
  if (DOI) {
    result.push({
      ...buildValidationResult(ObjectTypes.BibliographyValidationResult),
      type: 'bibliography-doi-format',
      passed: isValidDOI(DOI),
      affectedElementId: bibliographyItem._id,
    })
  }
  result.push({
    ...buildValidationResult(ObjectTypes.BibliographyValidationResult),
    type: 'bibliography-doi-exist',
    passed: !!DOI,
    affectedElementId: bibliographyItem._id,
  })
  return result
}
const validateFigureFormats = (
  modelMap: Map<string, ContainedModel>,
  allowedFormats: Array<string>
): Array<Build<FigureFormatValidationResult>> => {
  const figures = getModelsByType<Figure>(modelMap, ObjectTypes.Figure)
  const results: Build<FigureFormatValidationResult>[] = []
  figures.forEach((figure) => {
    if (figure.contentType) {
      const figFormat = getFigureFormat(figure.contentType)
      const validationResult = validateFigureFormat(
        'figure-format-validation',
        figFormat,
        figure._id,
        figure.contentType,
        allowedFormats
      )
      if (validationResult) {
        results.push(validationResult)
      }
    }
  })
  return results
}
export const validateFigureResolution = async function* (
  requirement: FigureResolutionsRequirements,
  figures: Array<Figure>,
  getData: (id: string) => Promise<Buffer>,
  template: ManuscriptTemplate
): AsyncGenerator<Build<FigureResolution> | undefined> {
  const validate = (
    type: FigureResolutionsType,
    count: number,
    checkMax: boolean,
    requirement?: CountRequirement,
    id?: string
  ) => {
    const result = validateFigureResolutionCount(
      type,
      count,
      checkMax,
      template,
      requirement
    )
    if (result) {
      result.data.id = id
    }
    return result
  }

  for (const { _id } of figures) {
    const figure = await getFigure(_id, getData)
    const { width, height } = imageSize(figure)
    const { min, max } = requirement

    if (width) {
      yield validate(
        'figure-minimum-width-resolution',
        width,
        false,
        min.width,
        _id
      )
      yield validate(
        'figure-maximum-width-resolution',
        width,
        true,
        max.width,
        _id
      )
    } else if (max.width || min.width) {
      throw new Error('Unknown image width')
    }

    if (height) {
      yield validate(
        'figure-minimum-height-resolution',
        height,
        false,
        min.height,
        _id
      )
      yield validate(
        'figure-maximum-height-resolution',
        height,
        true,
        max.height,
        _id
      )
    } else if (max.height || min.height) {
      throw new Error('Unknown image height')
    }
  }
}

const validateKeywordsOrder = (
  modelMap: Map<string, ContainedModel>
): Build<KeywordsOrderValidationResult> | undefined => {
  const [manuscript] = getModelsByType<Manuscript>(
    modelMap,
    ObjectTypes.Manuscript
  )
  if (!manuscript) {
    throw new InputError('Could not find a Manuscript object')
  }
  const { keywordIDs } = manuscript
  if (!keywordIDs || keywordIDs.length <= 0) {
    // No keywords skip
    return
  }
  const keywords: Array<ManuscriptKeyword> = []
  for (const id of keywordIDs) {
    const keyword = modelMap.get(id)
    if (!keyword) {
      throw new InputError(`${id} not found`)
    }
    keywords.push(keyword as ManuscriptKeyword)
  }

  const orderedKeywords = keywords.slice().sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      sensitivity: 'accent',
      ignorePunctuation: true,
    })
  )
  const order = orderedKeywords.map((keywords) => keywords._id)
  return {
    ...buildValidationResult(ObjectTypes.KeywordsOrderValidationResult),
    type: 'keywords-order',
    fixable: true,
    passed: JSON.stringify(orderedKeywords) === JSON.stringify(keywords),
    data: { order },
  }
}
export const createRequirementsValidator = (
  template: ManuscriptTemplate
) => async (
  manuscriptsData: ContainedModel[],
  manuscriptId: string,
  getData: GetData,
  options: validationOptions = { validateImageFiles: true }
): Promise<AnyValidationResult[]> => {
  const results: AnyValidationResult[] = []
  const manuscript = findModelByID(manuscriptsData, manuscriptId)
  if (!manuscript || !isManuscript(manuscript)) {
    throw new InputError(
      'manuscriptID does not match the one available in the Manuscript project.'
    )
  }
  const { article, modelMap } = createArticle(manuscriptsData, manuscriptId)
  const manuscriptsTitle: string = getManuscriptTitle(modelMap, manuscriptId)
  const addResult = addValidationResults(modelMap, results)
  // TODO: find parent template (title === template.parent) and merge requirements?
  // TODO: the requirements in the parent seem to be duplicates…

  const sectionsWithCategory = await buildSections(article, modelMap)
  // validate required sections
  const requiredSections = buildRequiredSections(template)
  const sectionCategories = new Set(sectionsWithCategory.keys())
  for await (const result of validateRequiredSections(
    requiredSections,
    sectionCategories
  )) {
    addResult(result)
  }

  if (!manuscriptHasMissingSection(modelMap, results)) {
    const result = validateSectionsOrder(requiredSections, sectionsWithCategory)
    addResult(result)
  }

  // validate manuscript counts
  const manuscriptCountRequirements = buildManuscriptCountRequirements(template)

  for await (const result of validateManuscriptCounts(
    article,
    manuscriptCountRequirements
  )) {
    addResult(result)
  }
  const everySectionWithCategory = await buildSections(article, modelMap, true)

  // validate section counts
  const sectionCountRequirements = buildSectionCountRequirements(template)

  for await (const result of validateSectionCounts(
    sectionsWithCategory,
    sectionCountRequirements
  )) {
    addResult(result)
  }
  // Validate section title requirement
  const sectionTitleRequirement = buildSectionTitleRequirements(template)
  for await (const result of validateSectionsTitle(
    sectionTitleRequirement,
    sectionsWithCategory
  )) {
    addResult(result)
  }

  for await (const result of validateSectionBody(sectionsWithCategory)) {
    addResult(result)
  }

  for await (const result of validateSectionsCategory(
    everySectionWithCategory
  )) {
    addResult(result)
  }
  //validate title count requirements
  const titleCountRequirements: CountRequirements = buildTitleCountRequirements(
    template
  )
  for await (const result of validateTitleCounts(
    manuscriptsTitle,
    titleCountRequirements
  )) {
    addResult(result)
  }
  const manuscriptReferenceCountRequirement = buildManuscriptReferenceCountRequirements(
    template
  )
  const references = getReferences(modelMap)
  for await (const result of validateReferenceCounts(
    references.length,
    manuscriptReferenceCountRequirement
  )) {
    addResult(result)
  }
  for await (const result of validateBibliography(modelMap, references)) {
    addResult(result)
  }
  const figureCountRequirements: FigureCountRequirements = buildFigureCountRequirements(
    template
  )
  for await (const result of validateFigureCounts(
    modelMap,
    figureCountRequirements
  )) {
    addResult(result)
  }

  const tableCountRequirements: TableCountRequirements = buildTableCountRequirements(
    template
  )
  for await (const result of validateTableCounts(
    modelMap,
    tableCountRequirements
  )) {
    addResult(result)
  }

  const combinedFigureTableCountRequirements: CombinedFigureTableCountRequirements = buildCombinedFigureTableCountRequirements(
    template
  )
  for await (const result of validateCombinedTableFigureCounts(
    modelMap,
    combinedFigureTableCountRequirements
  )) {
    addResult(result)
  }

  if (options.validateImageFiles) {
    const allowedFigureFormats = getAllowedFigureFormats(template)
    for (const result of validateFigureFormats(
      modelMap,
      allowedFigureFormats
    )) {
      addResult(result)
    }

    const allowedFigureResolutions = getAllowedFigureResolution(template)
    const figures = getModelsByType<Figure>(modelMap, ObjectTypes.Figure)
    const figuresWithImage = await getFiguresWithImage(figures, getData)

    for (const result of validateFigureContainsImage(
      figures,
      new Set(figuresWithImage.map((fig) => fig._id))
    )) {
      addResult(result)
    }

    for await (const result of validateFigureResolution(
      allowedFigureResolutions,
      figuresWithImage,
      getData as (id: string) => Promise<Buffer>,
      template
    )) {
      addResult(result)
    }
  }
  // validate keywords order
  const keywordsValidationResult = validateKeywordsOrder(modelMap)
  if (keywordsValidationResult) {
    addResult(keywordsValidationResult)
  }

  const contributorRequirements = buildContributorsCountRequirements(template)
  const contributors = findContributors(manuscriptId, manuscriptsData)

  for await (const result of validateContributorCountRequirements(
    contributorRequirements,
    contributors
  )) {
    addResult(result)
  }

  const runningTitleCountRequirements = buildRunningTitleCountRequirements(
    template
  )
  for await (const result of validateRunningTitleCount(
    manuscript.runningTitle,
    runningTitleCountRequirements
  )) {
    addResult(result)
  }

  return appendValidationMessages(results)
}

const getFiguresWithImage = async (
  figures: Array<Figure>,
  getData: GetData
): Promise<Array<Figure>> => {
  const results: Array<Figure> = []
  for (const figure of figures) {
    const image = await getData(figure._id)
    if (image) {
      results.push(figure)
    }
  }
  return results
}

const validateFigureContainsImage = function* (
  figures: Array<Figure>,
  figuresWithImages: Set<string>
): Generator<Build<FigureImageValidationResult>> {
  for (const { _id } of figures) {
    yield {
      ...buildValidationResult(ObjectTypes.FigureImageValidationResult),
      type: 'figure-contains-image',
      passed: figuresWithImages.has(_id),
      affectedElementId: _id,
    }
  }
}

const buildValidationResult = (type: ObjectTypes, severity = 0) => ({
  _id: generateID(type),
  objectType: type,
  ignored: false,
  severity,
})
