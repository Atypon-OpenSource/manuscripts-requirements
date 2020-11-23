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

import { Build, ContainedModel } from '@manuscripts/manuscript-transform'
import {
  KeywordsElement,
  KeywordsOrderValidationResult,
  Manuscript,
  ManuscriptKeyword,
  ObjectTypes,
  RequiredSectionValidationResult,
  Section,
  SectionOrderValidationResult,
  SectionTitleValidationResult,
} from '@manuscripts/manuscripts-json-schema'
import fs from 'fs'

import { runManuscriptFixes } from '../fix-manuscript'
import { isSection } from '../utils'
import { createTemplateValidator } from '../validate-manuscript'
import { data } from './__fixtures__/manuscript-data.json'

const parser = { parser: new DOMParser(), serializer: new XMLSerializer() }

test('Add and reorder sections', async () => {
  const data: Array<ContainedModel> = [
    {
      containerID: 'MPProject:1',
      createdAt: 0,
      updatedAt: 0,
      objectType: ObjectTypes.Manuscript,
      _id: 'test',
    },
  ]
  const orderedSections = [
    'MPSectionCategory:introduction',
    'MPSectionCategory:materials-method',
    'MPSectionCategory:abstract',
    'MPSectionCategory:results',
  ]

  const shuffledSections = orderedSections
    .map((el) => ({ sort: Math.random(), value: el }))
    .sort((a, b) => a.sort - b.sort)
    .map((el) => el.value)

  const requiredSectionValidationResults: Array<RequiredSectionValidationResult> = shuffledSections.map(
    (sectionCategory) =>
      Object.assign(
        {
          passed: false,
          severity: 0,
          type: 'required-section',
        },
        {
          data: {
            sectionDescription: {
              sectionCategory,
            },
          },
        }
      ) as RequiredSectionValidationResult
  )
  const requiredSectionsFix = runManuscriptFixes(
    data,
    'test',
    requiredSectionValidationResults,
    parser
  )
    .filter((model) => isSection(model))
    .map((model) => (model as Section).category)

  expect(requiredSectionsFix).toEqual(shuffledSections)

  const sectionOrderValidationResult: Array<Build<
    SectionOrderValidationResult
  >> = [
    {
      passed: false,
      severity: 0,
      type: 'section-order',
      data: {
        order: orderedSections,
      },
      _id: '',
      objectType: 'MPSectionOrderValidationResult',
    },
  ]
  const sectionsOrderFix = runManuscriptFixes(
    data,
    'test',
    sectionOrderValidationResult,
    parser
  )
    .filter((model) => isSection(model))
    .map((model) => model as Section)
    .filter((section) => {
      if (section.category) {
        return orderedSections.includes(section.category)
      }
      return false
    })
    .sort((a, b) => a.priority - b.priority)
    .map((section) => section.category)

  expect(sectionsOrderFix).toStrictEqual(orderedSections)
})

test('Retitle sections', async () => {
  const sectionID = 'MPSection:TEST'
  const requiredTitle = 'Methods'
  const manuscriptData = [
    {
      containerID: 'MPProject:1',
      manuscriptID: 'MPManuscript:1',
      createdAt: 0,
      updatedAt: 0,
      objectType: ObjectTypes.Manuscript,
      _id: 'test',
    },
    {
      containerID: 'MPProject:1',
      createdAt: 1601237242,
      updatedAt: 1601237242,
      sessionID: 'f0b3bf1b-4435-4829-84e9-4b8b3517b95c',
      _id: sectionID,
      objectType: ObjectTypes.Section,
      priority: 1,
      path: ['MPSection:B8FE1A66-6588-4065-BD2E-F6176CFD9CD4'],
      title: 'foo',
      category: 'MPSectionCategory:materials-method',
    },
  ]

  const validationResults: Build<SectionTitleValidationResult> = {
    _id: '',
    objectType: 'MPSectionTitleValidationResult',
    passed: false,
    severity: 0,
    type: 'section-title-match',
    data: {
      id: sectionID,
      title: requiredTitle,
    },
  }

  const results = runManuscriptFixes(
    manuscriptData,
    'test',
    [validationResults],
    { parser: new DOMParser(), serializer: new XMLSerializer() }
  )
  const testSection = results.find(
    (model) => model._id === 'MPSection:TEST'
  ) as Section
  expect(testSection.title).toMatch(requiredTitle)
})

test('Reorder keywords', async () => {
  const manuscriptData = [
    {
      objectType: ObjectTypes.Manuscript,
      _id: 'test',
      keywordIDs: [
        'MPManuscriptKeyword:2',
        'MPManuscriptKeyword:0',
        'MPManuscriptKeyword:1',
      ],
    },
    {
      objectType: ObjectTypes.Section,
      _id: 'MPSection:1',
      elementIDs: ['MPKeywordsElement:1'],
      category: 'MPSectionCategory:keywords',
    },
    {
      contents: '<p class="x y" id="test">Key1, Key2, Key0</p>',
      _id: 'MPKeywordsElement:1',
    },
  ] as Array<ContainedModel>

  for (let i = 0; i < 3; i++) {
    const keyword = Object.assign(
      {
        _id: '',
        objectType: 'MPManuscriptKeyword',
        name: `Key${i}`,
      },
      { _id: `MPManuscriptKeyword:${i}` }
    ) as ManuscriptKeyword
    manuscriptData.push(keyword)
  }
  const order = [
    'MPManuscriptKeyword:0',
    'MPManuscriptKeyword:1',
    'MPManuscriptKeyword:2',
  ]
  const validationResults: Build<KeywordsOrderValidationResult> = {
    passed: false,
    fix: true,
    severity: 0,
    type: 'keywords-order',
    data: {
      order,
    },
    objectType: 'MPKeywordsOrderValidationResult',
    _id: 'test',
  }

  const results = runManuscriptFixes(
    manuscriptData,
    'test',
    [validationResults],
    parser
  )

  const manuscript = results.find(
    (model) => model.objectType === ObjectTypes.Manuscript
  ) as Manuscript
  expect(manuscript.keywordIDs).toStrictEqual(order)

  const keywordsElement = results.find(
    (model) => model._id === 'MPKeywordsElement:1'
  ) as KeywordsElement
  const expectedContents = '<p class="x y" id="test">Key0, Key1, Key2</p>'
  expect(keywordsElement.contents).toStrictEqual(expectedContents)
})

test('Validate autofix', async () => {
  const validateManuscript = createTemplateValidator(
    'MPManuscriptTemplate:www-zotero-org-styles-nature-genetics-Nature-Genetics-Journal-Publication-Article'
  )

  const getData = async (id: string): Promise<Buffer | undefined> => {
    const path = `${__dirname}/__fixtures__/data/${id}`
    if (fs.existsSync(path)) {
      return fs.readFileSync(path)
    }
    return undefined
  }
  const manuscriptID = 'MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232'
  //@ts-ignore
  const manuscriptModels = data as Array<ContainedModel>
  const validationResults = await validateManuscript(
    manuscriptModels,
    manuscriptID,
    getData
  )
  const fixedModels = runManuscriptFixes(
    manuscriptModels,
    manuscriptID,
    validationResults,
    parser
  )
  const results = await validateManuscript(fixedModels, manuscriptID, getData)
  results.forEach((result) => {
    // make sure all the fixable objects are passed now
    const value = !result.passed && result.fix
    // TODO: section-order requires two fix passes if there is a missing sections can this be done in one pass?
    if (value && result.type === 'section-order') {
      return
    }
    expect(value).toBeFalsy()
  })
})
