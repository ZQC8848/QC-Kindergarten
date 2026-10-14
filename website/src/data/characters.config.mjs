// Single place that maps a character's folder under `character reference/`
// to its URL slug, accent colour, and English display name.
// Accent colours are sampled from each character's poster scene (DESIGN.md: 每角色一个强调色取自其立绘场景).
// `hoverCell` picks which cell of the 3×3 expression sheet the card shows on hover:
//   0 neutral · 1 happy · 2 sad · 3 angry · 4 surprised · 5 shy · 6 sleepy · 7 smug · 8 crying
// `focus` (optional) is the CSS object-position used when a poster is cropped: `card` for the 3:4
// character card, `avatar` for the round heads in story lists, story pages and relation lists.
// Defaults are 50% 50% (card) and 50% 15% (avatar); only posters whose face sits far from those need it.

export const characters = [
  { slug: 'fufu', folder: 'Fufu-enfp', accent: '#E0782A', hoverCell: 1, en: { name: 'Fufu' } },
  { slug: 'haide', folder: 'Haide-entp', accent: '#4C5D7C', hoverCell: 7, en: { name: 'Haide' } },
  { slug: 'mimi', folder: 'Mimi-enfj', accent: '#6A3D9E', hoverCell: 7, en: { name: 'Mimi' } },
  { slug: 'aisha', folder: '艾莎-intj', accent: '#8B1E33', hoverCell: 7, en: { name: 'Aisha' } },
  { slug: 'ruanruan', folder: '软软-infp', accent: '#D98A94', hoverCell: 8, en: { name: 'Ruanruan' } },
  { slug: 'lukos', folder: 'Lukos-infj', accent: '#6F849A', hoverCell: 5, en: { name: 'Lukos' } },
  { slug: 'whiskle', folder: 'Whiskle-infp', accent: '#6C8A5B', hoverCell: 5, en: { name: 'Whiskle' } },
  { slug: 'mushi', folder: '牧师-enfj', accent: '#D39A34', hoverCell: 1, en: { name: 'Mushi' } },
  { slug: 'dianer', folder: '点儿-intp', accent: '#6E7B8B', hoverCell: 6, en: { name: 'Dianer' } },
  { slug: 'luyao', folder: '陆姚-entj', accent: '#2E2B33', hoverCell: 3, en: { name: 'Luyao' } },
  { slug: 'liiie', folder: 'Liiie-infj', accent: '#B5306A', hoverCell: 6, en: { name: 'Liiie' } },
  // Jiuyue and Ming are a pair: near-complementary accents (CIEDE2000 50 apart), each
  // carrying a trace of the other's. Teal and vermilion were the two empty zones on the
  // cast's wheel; nearest existing accents are Whiskle (19.1) and Aisha (17.8).
  // hoverCell shows the side each hides: her rare smile, his rare shyness.
  { slug: 'jiuyue', folder: '九月-isfp', accent: '#2C7F7C', hoverCell: 1, en: { name: 'Jiuyue' } },
  { slug: 'ming', folder: '明-enfj', accent: '#C63D2C', hoverCell: 5, en: { name: 'Ming' } },
  // Greenish lemon rather than gold so it stays off Mushi's (20.1) and clear of Whiskle's
  // green (29.2). hoverCell 2: the one time he goes quiet, in front of a wilted plant.
  { slug: 'fortuno', folder: 'Fortuno-enfp', accent: '#D8D23A', hoverCell: 2, en: { name: 'Fortuno' } },
  // The blue-violet zone is crowded (Lukos, Dianer, Haide, Mimi), so the shark is pushed
  // lighter and pinker than his reference: nearest is Lukos at 16.3. hoverCell 8: losing
  // at chess and crying is the most him thing he does.
  { slug: 'qunzhu', folder: '群主-esfp', accent: '#A99CE0', hoverCell: 8, en: { name: 'Qunzhu' } },
  // Old-tea yellow-brown: the name says yellow, but bright yellow is Fortuno's and gold is
  // Mushi's (19.8), so it is pushed down to aged brass; brown was an empty zone. hoverCell 3:
  // nobody has ever seen him angry.
  { slug: 'laohuang', folder: '老黄-entj', accent: '#8C6A2E', hoverCell: 3, en: { name: 'Laohuang' } },
  {
    slug: 'qc',
    folder: 'QC-entp',
    accent: '#2C4A88',
    hoverCell: 7,
    en: { name: 'QC' },
    focus: { card: '50% 0%', avatar: '50% 12%' },
  },
];

// Names as they appear inside bibles / story `cast` lists → slug
export const nameToSlug = Object.fromEntries(
  characters.flatMap((c) => {
    const zh = c.folder.split('-')[0];
    return [
      [c.slug, c.slug],
      [zh, c.slug],
      [zh.toLowerCase(), c.slug],
      [c.en.name, c.slug],
      [c.en.name.toLowerCase(), c.slug],
    ];
  }),
);

// Bible sections that make up the "描述" block on a character page, in display order.
export const descriptionOrder = [
  '性格核心',
  '外形里的性格线索',
  '行为习惯',
  '表情与情绪',
  '喜欢 / 讨厌',
  '优点与课题',
  '道具的意义',
];

// Scene reference files → display names
// `file` is the PNG under Scene Reference/ and the value stories use in `location`;
// `slug` is the URL of the place page (/zh/places/<slug>/). The floor plan has no page.
export const scenes = [
  { file: 'Courtyard', slug: 'courtyard', zh: '庭院', en: 'Courtyard' },
  { file: 'Classroom', slug: 'classroom', zh: '教室', en: 'Classroom' },
  { file: 'ArtClassRoom', slug: 'art-room', zh: '美术室', en: 'Art room' },
  { file: 'GamingRoom', slug: 'game-room', zh: '游戏室', en: 'Game room' },
  { file: 'ReadingRoom', slug: 'reading-room', zh: '阅览室', en: 'Reading room' },
  { file: 'GreenHouse', slug: 'greenhouse', zh: '温室', en: 'Greenhouse' },
  { file: 'NapRoom', slug: 'nap-room', zh: '午睡室', en: 'Nap room' },
  { file: 'DiningRoom', slug: 'dining-room', zh: '餐厅', en: 'Dining room' },
  { file: 'Kitchen', slug: 'kitchen', zh: '厨房', en: 'Kitchen' },
  { file: 'EntryLobby', slug: 'entry-lobby', zh: '门厅', en: 'Entry lobby' },
  { file: 'HighwayNight', slug: 'highway-night', zh: '午夜高速', en: 'Highway at night' },
  { file: 'PrivateVillaPool', slug: 'villa-pool', zh: '私人别墅泳池', en: 'Private villa pool' },
  { file: 'Roadside', slug: 'roadside', zh: '路边', en: 'Roadside' },
  { file: 'Kindergarten-Map', slug: 'map', zh: '平面图', en: 'Floor plan' },
];
