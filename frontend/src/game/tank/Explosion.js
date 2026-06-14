export class Explosion {
  constructor(x, y, size = 'normal') {
    this.x = x
    this.y = y
    this.frame = 0
    this.maxFrames = size === 'large' ? 20 : 12
    this.size = size
    this.active = true
    this.particles = this.createParticles()
  }

  createParticles() {
    const particles = []
    const count = this.size === 'large' ? 16 : 8
    const baseSpeed = this.size === 'large' ? 4 : 2.5
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5
      const speed = baseSpeed * (0.6 + Math.random() * 0.8)
      particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (this.size === 'large' ? 6 : 4) * (0.7 + Math.random() * 0.6),
        life: 1
      })
    }
    return particles
  }

  update() {
    this.frame++
    if (this.frame >= this.maxFrames) {
      this.active = false
    }
    for (const p of this.particles) {
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.92
      p.vy *= 0.92
      p.life = 1 - (this.frame / this.maxFrames)
    }
  }

  render(ctx, offsetX, offsetY) {
    if (!this.active) return

    for (const p of this.particles) {
      const x = offsetX + p.x
      const y = offsetY + p.y

      ctx.save()
      ctx.globalAlpha = p.life

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size)
      if (this.size === 'large') {
        gradient.addColorStop(0, '#fff7ed')
        gradient.addColorStop(0.3, '#fb923c')
        gradient.addColorStop(0.7, '#dc2626')
        gradient.addColorStop(1, 'rgba(127, 29, 29, 0)')
      } else {
        gradient.addColorStop(0, '#fef3c7')
        gradient.addColorStop(0.5, '#f59e0b')
        gradient.addColorStop(1, 'rgba(180, 83, 9, 0)')
      }
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const progress = this.frame / this.maxFrames
    const shockwaveRadius = progress * (this.size === 'large' ? 60 : 35)
    ctx.save()
    ctx.globalAlpha = (1 - progress) * 0.6
    ctx.strokeStyle = this.size === 'large' ? '#fb923c' : '#fbbf24'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(offsetX + this.x, offsetY + this.y, shockwaveRadius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}
