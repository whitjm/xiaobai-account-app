#!/usr/bin/env node
/*
 * Claude Code 的提交门卫（PreToolUse hook，盯住 Bash 工具）。
 *
 * 作用：每当 Claude 要跑一条 Bash 命令，先经过这里。
 *   - 如果命令里包含 git commit，就检查 .claude/checks/ 下有没有两张通行证：
 *       test.pass    （单元测试全过，由 tester 生成）
 *       quality.pass （无高危安全问题，由 quality-engineer 生成）
 *     缺任意一张 → 用退出码 2 拦下这次提交，并把原因告诉 Claude。
 *   - 不是 git commit 的命令 → 直接放行。
 *
 * 这层门卫只管住"Claude 帮你跑的提交"。你自己在终端手敲的 git commit，
 * 由另一道 git 原生 hook（.git/hooks/pre-commit）兜底拦截。
 */

const fs = require('fs')
const path = require('path')

// 读取 Claude 从标准输入喂进来的 JSON（里面有这次要跑的命令）
let raw = ''
process.stdin.on('data', (chunk) => { raw += chunk })
process.stdin.on('end', () => {
  let command = ''
  try {
    const input = JSON.parse(raw)
    command = (input.tool_input && input.tool_input.command) || ''
  } catch (e) {
    // 解析不了就放行，不要因为门卫自身出错卡住正常操作
    process.exit(0)
  }

  // 判断是不是"真的在执行 git commit"：
  // 只在命令开头，或分隔符（&& || ; | 换行）之后出现 git commit 才算，
  // 避免误伤 echo 一句带这俩字、或写在别处的情况。
  const isRealCommit = /(^|&&|\|\||;|\||\n)\s*git\s+commit\b/.test(command)
  if (!isRealCommit) {
    process.exit(0)
  }

  // 是 git commit：检查两张通行证
  const checksDir = path.join(process.cwd(), '.claude', 'checks')
  const testPass = fs.existsSync(path.join(checksDir, 'test.pass'))
  const qualityPass = fs.existsSync(path.join(checksDir, 'quality.pass'))

  if (testPass && qualityPass) {
    // 两张齐全，放行
    process.exit(0)
  }

  // 缺证，拦下（退出码 2 = 阻止工具调用，stderr 内容会回传给 Claude）
  const missing = []
  if (!testPass) missing.push('  - 缺少单元测试通行证（.claude/checks/test.pass）')
  if (!qualityPass) missing.push('  - 缺少质量检查通行证（.claude/checks/quality.pass）')

  process.stderr.write(
    '\n提交被门卫拦下：还没通过检查，不能提交。\n' +
    missing.join('\n') + '\n\n' +
    '请走 /gitcommit 流程——它会先跑单元测试和质量检查，两道关都过了才提交。\n'
  )
  process.exit(2)
})
