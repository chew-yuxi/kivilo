import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { expect, test } from 'vitest'

test('agent screens draw pink action fills from the design system', () => {
  const localFill = /\bbg-(?:brand|pink)-(?:500|600|700)\b/
  const offenders: string[] = []
  for (const directory of ['src/app', 'src/components']) {
    for (const name of readdirSync(directory, { recursive: true, encoding: 'utf8' })) {
      if (!name.endsWith('.tsx')) continue
      const path = join(directory, name)
      const source = readFileSync(path, 'utf8')
      if (!localFill.test(source)) continue
      const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      function check(node: ts.Node) {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          if (['a', 'Link', 'button'].includes(node.tagName.getText(file))) {
            const classes = node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(file) === 'className')
            if (classes && localFill.test(classes.getText(file))) offenders.push(path)
          }
        } else if (ts.isVariableDeclaration(node) && ['primary', 'secondary'].includes(node.name.getText(file))) {
          if (node.initializer && localFill.test(node.initializer.getText(file))) offenders.push(path)
        }
        ts.forEachChild(node, check)
      }
      check(file)
    }
  }
  expect(offenders).toEqual([])
})
