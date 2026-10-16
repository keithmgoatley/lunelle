/**
 * Original week-by-week pregnancy notes (gestational weeks from LMP).
 * Deliberately brief and general; not a substitute for antenatal care.
 */
export interface WeekInfo {
  size: string;
  baby: string;
  you: string;
}

const W: Record<number, WeekInfo> = {
  0: { size: 'nothing yet', baby: 'Pregnancy is dated from the first day of your last period, so in weeks 0–2 conception hasn’t happened yet.', you: 'If you are planning a pregnancy, a daily folic acid supplement is recommended before conception and through the first trimester.' },
  3: { size: 'a grain of salt', baby: 'Fertilisation has happened and a tiny ball of cells is travelling to the uterus to implant.', you: 'Some people notice light spotting around implantation. Most notice nothing at all.' },
  4: { size: 'a sesame seed', baby: 'The embryo has implanted and the placenta and amniotic sac are starting to form.', you: 'A home test may now show positive. Book in with your doctor or midwife to start antenatal care.' },
  5: { size: 'a peppercorn', baby: 'The neural tube, which becomes the brain and spinal cord, is forming. A simple heart tube begins to pulse.', you: 'Tiredness, tender breasts and needing to pee more often are common early signs.' },
  6: { size: 'a lentil', baby: 'Small buds that will become arms and legs appear, and facial features begin to take shape.', you: 'Nausea often starts around now. Small, frequent meals and sips of water can help.' },
  7: { size: 'a blueberry', baby: 'The brain is growing quickly, and the kidneys and liver are developing.', you: 'Strong smells may bother you. Being unable to keep any fluids down needs medical attention.' },
  8: { size: 'a kidney bean', baby: 'Fingers and toes are forming as webbed paddles. The embryo starts making small movements.', you: 'Your uterus is growing, though it’s still hidden behind the pelvic bone.' },
  9: { size: 'a cherry tomato', baby: 'Basic structures of all the major organs are in place.', you: 'Mood swings are normal as hormones rise quickly.' },
  10: { size: 'a strawberry', baby: 'Now called a fetus. Tiny nails and tooth buds are forming.', you: 'You may be offered blood tests and screening around this time.' },
  11: { size: 'a lime', baby: 'Bones are beginning to harden and the head makes up about half of the body length.', you: 'Some people feel the first easing of nausea.' },
  12: { size: 'a plum', baby: 'Reflexes are developing. The fetus can open and close its fingers.', you: 'Many people have a dating scan around now. The risk of miscarriage drops noticeably after this point.' },
  13: { size: 'a lemon', baby: 'Vocal cords are forming and the intestines move into the abdomen.', you: 'You’re at the end of the first trimester. Energy often starts to return.' },
  14: { size: 'a peach', baby: 'Fine hair (lanugo) begins to grow, and the fetus may make facial expressions.', you: 'Second trimester. Many people find this the most comfortable stretch.' },
  15: { size: 'an apple', baby: 'The skeleton keeps hardening, and the fetus can sense light through closed eyelids.', you: 'Nosebleeds and blocked noses are common because blood volume increases.' },
  16: { size: 'an avocado', baby: 'Muscles are strengthening and movements are becoming more coordinated.', you: 'Some people feel the first flutters (quickening) from now to about week 20.' },
  17: { size: 'a pear', baby: 'Fat stores begin to build and the umbilical cord gets thicker.', you: 'Your centre of gravity is shifting. Supportive shoes help.' },
  18: { size: 'a bell pepper', baby: 'Ears are in their final position and the fetus may hear muffled sounds.', you: 'Sleeping on your side becomes more comfortable. A pillow between the knees helps.' },
  19: { size: 'a mango', baby: 'A protective waxy coating (vernix) forms on the skin.', you: 'Round ligament pain, a sharp pull low in the belly, is common when you move suddenly.' },
  20: { size: 'a banana', baby: 'Halfway. Regular sleep and wake cycles are forming.', you: 'A detailed anomaly scan is usually offered around 18–21 weeks.' },
  21: { size: 'a carrot', baby: 'The fetus swallows amniotic fluid, which is practice for digestion.', you: 'Movements are getting stronger and easier to notice.' },
  22: { size: 'a coconut', baby: 'Lips, eyelids and eyebrows are more distinct.', you: 'Stretch marks may appear. They are very common and usually fade over time.' },
  23: { size: 'a grapefruit', baby: 'Lungs are developing the branches they’ll need to breathe.', you: 'Swollen ankles are common. Sudden swelling of the face or hands should be checked promptly.' },
  24: { size: 'a corn cob', baby: 'The inner ear is mature, so balance and sound sensing are improving.', you: 'You may be offered a glucose test between 24 and 28 weeks.' },
  25: { size: 'a cauliflower', baby: 'Hands are fully formed and the startle reflex is developing.', you: 'Heartburn often shows up as the uterus pushes upward.' },
  26: { size: 'a lettuce', baby: 'Eyes begin to open and the fetus responds more to sound.', you: 'Practice contractions (Braxton Hicks) can feel like brief tightening.' },
  27: { size: 'a head of broccoli', baby: 'The brain is very active, and hiccups may be felt as rhythmic taps.', you: 'Last week of the second trimester.' },
  28: { size: 'an aubergine', baby: 'Eyelashes are present and the eyes can blink.', you: 'Third trimester. Learn your baby’s usual movement pattern and get checked the same day if movements slow or change.' },
  29: { size: 'a butternut squash', baby: 'Muscles and lungs keep maturing and the head is growing to fit the brain.', you: 'Leg cramps at night are common. Stretching your calves can help.' },
  30: { size: 'a cabbage', baby: 'Lanugo starts to thin as fat under the skin keeps the baby warm.', you: 'Shortness of breath is common as the uterus presses upward.' },
  31: { size: 'a pineapple', baby: 'All five senses are working.', you: 'Leaking a little colostrum (early milk) is normal.' },
  32: { size: 'a large jicama', baby: 'Toenails and fingernails are fully grown.', you: 'Rest often. Headaches, vision changes or upper belly pain need urgent checks for pre-eclampsia.' },
  33: { size: 'a honeydew melon', baby: 'The skull bones stay soft and flexible for birth.', you: 'Think about your birth preferences and pack a hospital bag.' },
  34: { size: 'a cantaloupe', baby: 'The central nervous system and lungs are maturing quickly.', you: 'Fatigue often returns. Pace yourself.' },
  35: { size: 'a small pumpkin', baby: 'Most growth now is weight gain.', you: 'Peeing more often comes back as the baby moves lower.' },
  36: { size: 'a romaine lettuce', baby: 'Many babies settle head-down by now.', you: 'You may be asked about your baby’s position at check-ups.' },
  37: { size: 'a bunch of chard', baby: 'Early term. The baby is practising breathing, sucking and gripping.', you: 'Know the signs of labour: regular contractions, waters breaking or a “show”.' },
  38: { size: 'a leek', baby: 'Organs are ready for life outside the womb.', you: 'Rest when you can. Call your maternity unit with any questions.' },
  39: { size: 'a mini watermelon', baby: 'Full term. The brain is still developing fast.', you: 'Only a minority of babies arrive exactly on the due date. Anywhere from 37 to 42 weeks is normal.' },
  40: { size: 'a watermelon', baby: 'Due date. The baby is ready to meet you.', you: 'If you go past your due date, your care team will talk you through monitoring and options.' },
};

/** Returns the closest defined week at or below `week`. */
export function weekInfo(week: number): WeekInfo {
  const w = Math.max(0, Math.min(40, week));
  for (let i = w; i >= 0; i--) if (W[i]) return W[i];
  return W[0];
}

export const PREGNANCY_WEEKS = Object.keys(W).map(Number);
