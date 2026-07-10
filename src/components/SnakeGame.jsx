import { useEffect, useRef, useState, useCallback } from 'react'

// 贪吃蛇小游戏:用 Canvas 逐帧绘制。经典玩法——方向键控制、吃食物变长、
// 撞墙或撞到自己结束,显示当前得分和最高分(最高分存在浏览器本地,下次打开还在)。

const COLS = 20 // 棋盘列数
const ROWS = 20 // 棋盘行数
const CELL = 20 // 每个格子的像素大小
const SPEED = 130 // 蛇每走一步的间隔(毫秒),越小越快
const BEST_KEY = 'snake_best_score' // 最高分在本地存储里的键名

// 方向向量
const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const TOTAL_CELLS = COLS * ROWS // 棋盘总格子数,用于判断是否已填满(通关)

// 读取本地保存的最高分,坏数据(非数字)一律当 0,避免显示 NaN、比较全部失效
function readBest() {
  const n = Number(localStorage.getItem(BEST_KEY))
  return Number.isFinite(n) ? n : 0
}

// 在蛇身以外随机放一个食物;若已无空格(蛇填满棋盘)返回 null,交由调用方判定通关
function randFood(snake) {
  if (snake.length >= TOTAL_CELLS) return null
  while (true) {
    const f = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    }
    if (!snake.some((s) => s.x === f.x && s.y === f.y)) return f
  }
}

export default function SnakeGame() {
  const canvasRef = useRef(null)

  const [score, setScore] = useState(0)
  const [best, setBest] = useState(readBest)
  const [status, setStatus] = useState('ready') // ready | playing | paused | over | won
  const [isNewRecord, setIsNewRecord] = useState(false) // 本局是否刷新了最高分

  // 用 ref 保存游戏实时状态,避免频繁触发 React 重渲染影响流畅度
  const snakeRef = useRef([{ x: 10, y: 10 }])
  const dirRef = useRef(DIRS.right)
  const nextDirRef = useRef(DIRS.right) // 缓冲下一步方向,防止一帧内连按掉头
  const scoreRef = useRef(0) // 实时得分,供 endGame 直接读取,避免在 setState 更新函数里套逻辑
  const bestRef = useRef(best) // 最高分的实时值,绕开 memoized 回调里的闭包旧值问题
  // 注意:useRef 不支持惰性初始化,若直接写 useRef(randFood(...)) 会每次渲染都重算一次,
  // 这里先留空,首帧的 useEffect 里再放食物。
  const foodRef = useRef(null)
  const statusRef = useRef('ready')

  // 画面绘制
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const W = COLS * CELL
    const H = ROWS * CELL

    // 背景:淡绿到淡蓝的柔和渐变,像一块草地
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#eef7f0')
    bg.addColorStop(1, '#eaf1f8')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // 淡淡的网格线
    ctx.strokeStyle = 'rgba(0,0,0,0.04)'
    ctx.lineWidth = 1
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath()
      ctx.moveTo(i * CELL, 0)
      ctx.lineTo(i * CELL, H)
      ctx.stroke()
    }
    for (let i = 1; i < ROWS; i++) {
      ctx.beginPath()
      ctx.moveTo(0, i * CELL)
      ctx.lineTo(W, i * CELL)
      ctx.stroke()
    }

    // 食物(红色圆点 + 柔光晕)
    const food = foodRef.current
    const fcx = food.x * CELL + CELL / 2
    const fcy = food.y * CELL + CELL / 2
    ctx.save()
    ctx.shadowColor = 'rgba(255, 59, 48, 0.55)'
    ctx.shadowBlur = 10
    ctx.fillStyle = '#FF3B30'
    ctx.beginPath()
    ctx.arc(fcx, fcy, CELL / 2 - 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // 蛇:蛇身绿色圆角块,蛇头稍深并带一对眼睛
    const snake = snakeRef.current
    const dir = dirRef.current
    snake.forEach((seg, i) => {
      const pad = 1.5
      const x = seg.x * CELL + pad
      const y = seg.y * CELL + pad
      const size = CELL - pad * 2
      ctx.fillStyle = i === 0 ? '#248A3D' : '#34C759'
      ctx.beginPath()
      ctx.roundRect(x, y, size, size, i === 0 ? 7 : 5)
      ctx.fill()

      // 蛇头画眼睛
      if (i === 0) {
        const cx = seg.x * CELL + CELL / 2
        const cy = seg.y * CELL + CELL / 2
        const off = CELL * 0.2 // 眼睛离中心的偏移
        // 眼睛垂直于前进方向分布
        const ex = dir.x === 0 ? off : 0
        const ey = dir.y === 0 ? off : 0
        // 眼睛朝前进方向靠一点
        const fx = dir.x * off * 0.6
        const fy = dir.y * off * 0.6
        const eyeR = CELL * 0.11
        ctx.fillStyle = '#fff'
        for (const s of [-1, 1]) {
          ctx.beginPath()
          ctx.arc(cx + fx + s * ex, cy + fy + s * ey, eyeR, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = '#1c1c1e'
        for (const s of [-1, 1]) {
          ctx.beginPath()
          ctx.arc(cx + fx + s * ex, cy + fy + s * ey, eyeR * 0.55, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    })
  }, [])

  // 走一步
  const step = useCallback(() => {
    dirRef.current = nextDirRef.current
    const dir = dirRef.current
    const snake = snakeRef.current
    const head = snake[0]
    const newHead = { x: head.x + dir.x, y: head.y + dir.y }

    // 撞墙判定
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      endGame()
      return
    }
    // 撞到自己判定
    if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      endGame()
      return
    }

    const newSnake = [newHead, ...snake]
    const food = foodRef.current
    if (food && newHead.x === food.x && newHead.y === food.y) {
      // 吃到食物:加分、不去尾(变长)、重新放食物
      scoreRef.current += 1
      setScore(scoreRef.current)
      const next = randFood(newSnake)
      foodRef.current = next
      snakeRef.current = newSnake
      if (!next) {
        // 已无空格可放:蛇填满整个棋盘,通关
        endGame(true)
        return
      }
    } else {
      newSnake.pop() // 没吃到:去掉尾巴,长度不变
      snakeRef.current = newSnake
    }
    draw()
  }, [draw])

  // won=true 表示填满棋盘通关,否则是撞死
  function endGame(won = false) {
    statusRef.current = won ? 'won' : 'over'
    setStatus(won ? 'won' : 'over')

    const finalScore = scoreRef.current
    // 严格大于旧纪录才算破纪录(平纪录不算),副作用都放在 setState 之外
    const beat = finalScore > bestRef.current
    setIsNewRecord(beat)
    if (beat) {
      bestRef.current = finalScore
      localStorage.setItem(BEST_KEY, String(finalScore))
      setBest(finalScore)
    }
  }

  const reset = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }]
    dirRef.current = DIRS.right
    nextDirRef.current = DIRS.right
    foodRef.current = randFood(snakeRef.current)
    scoreRef.current = 0
    setScore(0)
    setIsNewRecord(false)
    statusRef.current = 'playing'
    setStatus('playing')
    draw()
  }, [draw])

  const togglePause = useCallback(() => {
    if (statusRef.current === 'playing') {
      statusRef.current = 'paused'
      setStatus('paused')
    } else if (statusRef.current === 'paused') {
      statusRef.current = 'playing'
      setStatus('playing')
    }
  }, [])

  // 游戏主循环:每隔 SPEED 毫秒走一步
  useEffect(() => {
    const timer = setInterval(() => {
      if (statusRef.current === 'playing') step()
    }, SPEED)
    return () => clearInterval(timer)
  }, [step])

  // 键盘控制
  useEffect(() => {
    function onKey(e) {
      const map = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      }
      const key = map[e.key]
      if (key) {
        e.preventDefault()
        const nd = DIRS[key]
        // 以"已排队的下一步方向"为参照判断掉头,保证一个时间片内连按多次转向也一致
        const cur = nextDirRef.current
        // 禁止直接掉头(比如正在向右时不能立刻向左)
        if (nd.x === -cur.x && nd.y === -cur.y) return
        nextDirRef.current = nd
        return
      }
      if (e.key === ' ') {
        e.preventDefault()
        if (statusRef.current === 'playing' || statusRef.current === 'paused') togglePause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePause])

  // 首帧:放好初始食物并画一张初始画面
  useEffect(() => {
    if (!foodRef.current) foodRef.current = randFood(snakeRef.current)
    draw()
  }, [draw])

  return (
    <div className="page snake-page">
      <h2 className="page-title">🐍 贪吃蛇</h2>

      <div className="snake-card">
        <div className="snake-scoreboard">
          <div className="snake-score-box">
            <span className="snake-score-label">得分</span>
            <span className="snake-score-value">{score}</span>
          </div>
          <div className="snake-score-box snake-score-best">
            <span className="snake-score-label">最高分</span>
            <span className="snake-score-value">{best}</span>
          </div>
        </div>

        <div className="snake-stage">
          <canvas
            ref={canvasRef}
            width={COLS * CELL}
            height={ROWS * CELL}
            className="snake-canvas"
          />

          {status !== 'playing' && (
            <div className="snake-overlay">
              {status === 'ready' && (
                <>
                  <p className="snake-overlay-emoji">🐍</p>
                  <p className="snake-overlay-title">贪吃蛇</p>
                  <p className="snake-overlay-tip">方向键 / WASD 控制,空格暂停</p>
                  <button className="btn-primary snake-btn" onClick={reset}>
                    开始游戏
                  </button>
                </>
              )}
              {status === 'paused' && (
                <>
                  <p className="snake-overlay-emoji">⏸️</p>
                  <p className="snake-overlay-title">已暂停</p>
                  <button className="btn-primary snake-btn" onClick={togglePause}>
                    继续
                  </button>
                </>
              )}
              {status === 'over' && (
                <>
                  <p className="snake-overlay-emoji">💥</p>
                  <p className="snake-overlay-title">游戏结束</p>
                  <p className="snake-overlay-tip">
                    本局得分 {score}
                    {isNewRecord ? ' · 新纪录!🎉' : ''}
                  </p>
                  <button className="btn-primary snake-btn" onClick={reset}>
                    再来一局
                  </button>
                </>
              )}
              {status === 'won' && (
                <>
                  <p className="snake-overlay-emoji">🏆</p>
                  <p className="snake-overlay-title">通关啦!</p>
                  <p className="snake-overlay-tip">
                    你填满了整个棋盘,得分 {score}
                    {isNewRecord ? ' · 新纪录!🎉' : ''}
                  </p>
                  <button className="btn-primary snake-btn" onClick={reset}>
                    再来一局
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="snake-controls">
          {status === 'playing' && (
            <button className="btn-ghost snake-ctrl-btn" onClick={togglePause}>
              ⏸ 暂停
            </button>
          )}
          {status === 'paused' && (
            <button className="btn-ghost snake-ctrl-btn" onClick={togglePause}>
              ▶ 继续
            </button>
          )}
          {(status === 'playing' || status === 'paused') && (
            <button className="btn-ghost snake-ctrl-btn" onClick={reset}>
              ↻ 重新开始
            </button>
          )}
        </div>

        <p className="snake-hint">
          方向键或 <b>W / A / S / D</b> 控制方向,<b>空格</b> 暂停。吃到红点得分变长,撞墙或撞到自己就结束。
        </p>
      </div>
    </div>
  )
}
