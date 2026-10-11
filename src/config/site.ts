/**
 * 站点配置（Config 层，仅依赖 Types）。
 *
 * 技术栈五项结论与视觉方向见 docs/design-docs/core-beliefs.md。
 */

export const SITE = {
  /** 站点主标题。内容以中文优先（用户 m00152 Q16 决策）。 */
  title: '何楚福',
  role: 'AI 算法工程师',
  description: '个人网站：项目、笔记与影像',
  locale: 'zh-CN',
  email: '2100918674@qq.com',
  github: 'https://github.com/iheee-google',
} as const;

/**
 * 动效 token。
 *
 * 房子缓动取自 transitions.dev 的 `--ease-smooth-out`（用户 m00831 提供的研究对象之一），
 * 在深色编辑型版式上比弹性曲线更合适；弹性曲线仅保留给「进入」。
 * 依据：docs/design-docs/animation-capabilities.md、emil-design-eng 技能。
 */
export const MOTION = {
  ease: {
    out: 'cubic-bezier(0.22, 1, 0.36, 1)',
    inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
    drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
    /** 仅用于进入，绝不用于关闭 */
    overshoot: 'cubic-bezier(0.34, 1.36, 0.64, 1)',
  },
  duration: {
    press: 120,
    tooltip: 160,
    dropdown: 200,
    modal: 250,
    panel: 350,
    reveal: 500,
  },
  /** 交错步长，总时长控制在 300ms 内 */
  stagger: 40,
} as const;

/** 内容分区在界面上的显示名与顺序 */
export const SECTION_LABELS: Record<string, string> = {
  linuxdo: 'linux.do',
  目标检测: '目标检测',
  安卓逆向: '安卓逆向',
  工作: '工作',
  毕设: '毕业设计',
  程序设计: '程序设计',
  面试: '面试',
  AIGC: 'AIGC',
  项目: '项目',
  教父: '《教父》三部曲',
};
