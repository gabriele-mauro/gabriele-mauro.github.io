// Fixed UI text: the only strings allowed outside src/content/ (see CLAUDE.md, "Fixed UI text").
// Everything else on the page comes from the content files.

export const ui = {
  email: 'Email',
  cv: 'CV',
  interests: 'Interests:',
  sections: {
    now: 'Current work',
    papers: 'Publications',
    teaching: 'Teaching',
    earlier: 'Before research',
  },
  with: 'With',
  and: 'and', // joins the last two names in a "With …" line
  status: {
    underReview: 'Under review.',
    preprint: 'Preprint.',
    toAppear: 'To appear in',
  },
  alphabeticalNote:
    'Authors are listed in alphabetical order, as is usual in theoretical computer science.',
  lastUpdated: 'Last updated',
  skipLink: 'Skip to content',
  figureTitle:
    'A small graph: most edges fade and a few remain, drawn thicker. This is what a spectral sparsifier does.',
  notFound: {
    text: "This page doesn't exist.",
    link: 'Go to the home page',
  },
} as const;

// Month abbreviations for gutter dates, as in the CV (Intl may give "Sept").
export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

// Paper link labels, in the order they are shown.
export const paperLinks = [
  ['arxiv', 'arXiv'],
  ['pdf', 'PDF'],
  ['code', 'code'],
  ['slides', 'slides'],
] as const;
