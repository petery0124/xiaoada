/* 衣柜里的所有东西：名字、文案、对应的原图、原版搭配 */
window.DATA = {
  name: '小阿答',
  outfit: [
    { id: 'strawberry', name: '草莓格子裙', en: 'Strawberry Gingham', line: '草莓季限定。甜度刚刚好，一点不腻。', photo: 'strawberry', set: { bg: 'pinkroom' } },
    { id: 'lolita', name: '黑白洛丽塔', en: 'Monochrome Lolita', line: '黑白配猫耳，优雅和可爱一次到位。', photo: 'lolita', set: { bg: 'pinkroom' } },
    { id: 'bunny', name: '蓝色兔兔裙', en: 'Bunny Blue', line: '软软的兔兔裙，看一眼心情就变好。', photo: 'bunny', set: { bg: 'pinkroom' } },
    { id: 'jk', name: 'JK 制服', en: 'Lakeside Uniform', line: '湖边风很大，但发型一根都没乱，佩服。', photo: 'jk', set: { bg: 'lake' } },
    { id: 'whitebow', name: '白纱裙', en: 'White Ribbon', line: '黑丝带一系，仙气直接拉满。', photo: 'whitebow', set: { bg: 'pinkroom' } },
    { id: 'tiara', name: '米色蕾丝裙', en: 'Lace & Tiara', line: '戴着皇冠吃披萨。公主也是要吃饱的。', photo: 'tiara', set: { bg: 'pizza' } },
    { id: 'panda', name: '熊猫卫衣', en: 'Panda Hoodie', line: '成都限定。熊猫本熊，毛茸茸认证。', photo: 'panda', set: { bg: 'chengdu' } },
    { id: 'blondetee', name: '黑色大T恤', en: 'Blonde Nights', line: '金发那阵子，走路都带风。', photo: 'blonde', set: { bg: 'night' } },
    { id: 'scarf', name: '灰围巾大衣', en: 'Winter Scarf', line: '围巾一裹，冬天都变温柔了。', photo: 'scarf', set: { bg: 'snow' } },
    { id: 'lilac', name: '淡紫吊带裙', en: 'Lilac Satin', line: '烛光、花串、一杯橙色的饮料，氛围感满分。', photo: 'lilac', set: { bg: 'restaurant' } },
    { id: 'birthday', name: '生日限定', en: 'Birthday Edition', hidden: true, line: '生日那天的你。愿往后每一年，都有花、有蛋糕、有人记得。', photo: 'birthday', set: { bg: 'birthday' } },
  ],
  // fx：这个场景里飘的东西  tone：场景的主色调，用来打光
  bg: [
    { id: 'pinkroom', name: '粉色小屋', img: 'lolita', fx: 'petals', tone: '#f6b9c9', line: '最熟悉的镜子前。' },
    { id: 'lake', name: '湖边', img: 'jk', fx: 'sparkle', tone: '#9ec9ea', line: '有风的那天。' },
    { id: 'pizza', name: '披萨店', img: 'tiara', fx: 'bokeh', tone: '#f0c48a', line: '有披萨就是好地方。' },
    { id: 'chengdu', name: '成都', img: 'panda', fx: 'bokeh', tone: '#b9d98c', line: '熊猫的老家。' },
    { id: 'piano', name: '花房钢琴', img: 'piano', fx: 'petals', tone: '#d7b6e6', line: '被花包围的那天。' },
    { id: 'aquarium', name: '水族馆', img: 'aquarium', fx: 'bubbles', tone: '#7fc4e8', line: '鱼在看你。' },
    { id: 'night', name: '夜晚街头', img: 'night', fx: 'stars', tone: '#8d9bd6', line: '路灯也很温柔。' },
    { id: 'restaurant', name: '烛光餐厅', img: 'lilac', fx: 'bokeh', tone: '#f2b58a', line: '氛围感满分的那家店。' },
    { id: 'birthday', name: '生日那天', img: 'birthday', fx: 'confetti', tone: '#f4c2d7', line: '有花有蛋糕的那天。' },
    { id: 'snow', name: '落雪', img: 'scarf', fx: 'snow', tone: '#cfd8e8', line: '冬天的车窗外。' },
    { id: 'cream', name: '奶油色', img: null, fx: 'sparkle', tone: '#f3dcc8', line: '干干净净，什么都不抢戏。' },
  ],
  greetings: {
    morning: '早上好，{name}。衣柜已经晒过太阳了。',
    noon: '中午好，{name}。先换一套再去吃饭？',
    afternoon: '下午好，{name}。今天想穿哪一套？',
    evening: '晚上好，{name}。衣柜给你留了一盏灯。',
    night: '夜深了，{name}。换一套，然后早点睡。',
  },
  // 试穿完所有衣服后解锁的信
  letter: {
    title: '衣柜最深处',
    body: [
      '小阿答：',
      '从 22 年到现在，你朋友圈里那些好看的瞬间，我觉得不应该只是划过去就算了。',
      '所以把它们搬进了这个小衣柜，想穿哪套穿哪套，想去哪里就换个背景。',
      '没有什么特别的理由，就是觉得你值得一个小惊喜。',
      '希望你打开的时候，是开心的。',
    ],
    sign: '一个觉得你很好的朋友',
  },
};
