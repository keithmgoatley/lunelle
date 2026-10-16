/** Short, original phase notes shown on the home screen. */
import type { Phase } from '../engine/predict';

export const PHASE_TIPS: Record<Phase, string> = {
  menstrual:
    'Your uterus is shedding its lining, and oestrogen and progesterone are at their lowest. Cramps, tiredness and lower energy are common. Warmth, gentle movement, iron-rich food and extra rest can help. Soaking a pad or tampon every hour, or pain that stops you functioning, is worth raising with a doctor.',
  follicular:
    'Oestrogen is rising as a follicle matures in one ovary. Many people notice more energy, better mood and clearer skin around now. It’s a good time for harder workouts and new plans.',
  ovulatory:
    'You’re in your estimated fertile window. Discharge often becomes clear and stretchy, and an LH surge comes 24–36 hours before an egg is released. Some feel a one-sided twinge (mittelschmerz). Sperm can survive up to five days, which is why the window starts before ovulation.',
  luteal:
    'After ovulation, progesterone rises and your temperature goes up slightly. Towards the end you may notice bloating, breast tenderness, cravings or mood changes (PMS). Regular meals, sleep and less caffeine can help. Mood changes that seriously affect your life could be PMDD, which is treatable, so talk to a doctor.',
};
