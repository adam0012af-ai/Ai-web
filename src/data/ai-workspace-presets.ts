export type WorkspaceLocale = 'ar' | 'en';

export type WorkspaceMode = {
  id: string;
  label: string;
  instruction: string;
};

export type WorkspacePreset = {
  id: string;
  title: string;
  prompt: string;
};

const writingSlugs = new Set([
  'writer',
  'rewriter',
  'email',
  'article',
  'blog',
  'professional',
  'marketing',
  'social',
  'product',
  'story',
]);

const analysisSlugs = new Set([
  'summarizer',
  'qa',
  'seo',
]);

export function getWorkspaceModes(
  slug: string,
  locale: WorkspaceLocale,
): WorkspaceMode[] {
  const ar = locale === 'ar';

  if (slug === 'image') {
    return [
      {
        id: 'visible',
        label: ar ? 'الظاهر فقط' : 'Visible only',
        instruction:
          'STRICT VISUAL MODE: Base the answer only on clearly visible or legibly readable evidence in the current image. Do not guess hidden, cropped, blurry, or ambiguous details. Separate visible facts from inference and explicitly state uncertainty.',
      },
      {
        id: 'ocr',
        label: ar ? 'استخراج النص' : 'Extract text',
        instruction:
          'OCR MODE: Focus on accurately transcribing text that is actually legible in the image. Preserve spelling, capitalization, numbers, and visible line structure where practical. Mark unreadable portions as unclear instead of guessing.',
      },
      {
        id: 'ui',
        label: ar ? 'تحليل الواجهة' : 'UI analysis',
        instruction:
          'UI REVIEW MODE: Identify visible interface structure, controls, hierarchy, spacing, responsive issues, usability problems, and concrete improvements. Do not infer backend behavior that is not visible.',
      },
      {
        id: 'design',
        label: ar ? 'نقد التصميم' : 'Design critique',
        instruction:
          'DESIGN CRITIQUE MODE: Evaluate visible hierarchy, typography, spacing, balance, contrast, consistency, color usage, and composition. Distinguish objective observations from subjective recommendations.',
      },
      {
        id: 'technical',
        label: ar ? 'لقطة تقنية' : 'Technical screenshot',
        instruction:
          'TECHNICAL SCREENSHOT MODE: Read visible logs, status labels, file paths, errors, warnings, and metrics carefully. Diagnose only what the visible evidence supports. If the exact root cause is not visible, say what additional log line or detail is required.',
      },
    ];
  }

  if (slug === 'document') {
    return [
      {
        id: 'summary',
        label: ar ? 'ملخص ذكي' : 'Smart summary',
        instruction:
          'DOCUMENT SUMMARY MODE: Produce a faithful structured summary preserving important facts, numbers, names, constraints, caveats, decisions, and unresolved points.',
      },
      {
        id: 'facts',
        label: ar ? 'حقائق وأرقام' : 'Facts & numbers',
        instruction:
          'FACT EXTRACTION MODE: Extract verifiable facts, dates, numbers, names, requirements, and explicit claims. Do not add information that is absent from the document.',
      },
      {
        id: 'actions',
        label: ar ? 'خطة عمل' : 'Action plan',
        instruction:
          'ACTION MODE: Convert the document into clear prioritized actions, owners or dependencies when explicitly available, and unresolved questions. Do not invent deadlines or responsibilities.',
      },
      {
        id: 'risks',
        label: ar ? 'مخاطر وثغرات' : 'Risks & gaps',
        instruction:
          'RISK REVIEW MODE: Identify contradictions, missing information, risks, assumptions, ambiguous requirements, and decisions that need confirmation, grounded only in the supplied document.',
      },
    ];
  }

  if (slug === 'code') {
    return [
      {
        id: 'debug',
        label: ar ? 'إصلاح خطأ' : 'Debug',
        instruction:
          'DEBUG MODE: Find the most likely cause from the supplied code or error, explain the evidence, then provide the smallest safe fix first.',
      },
      {
        id: 'review',
        label: ar ? 'مراجعة كود' : 'Code review',
        instruction:
          'CODE REVIEW MODE: Review correctness, security, maintainability, performance, edge cases, and typing. Prioritize concrete issues over style preferences.',
      },
      {
        id: 'explain',
        label: ar ? 'شرح بسيط' : 'Explain',
        instruction:
          'EXPLAIN MODE: Explain the code clearly from high level to important details, including inputs, outputs, data flow, and non-obvious behavior.',
      },
      {
        id: 'build',
        label: ar ? 'إنشاء كود' : 'Build',
        instruction:
          'BUILD MODE: Produce complete, production-minded code matching the request. Prefer secure, typed, maintainable implementation and mention only critical setup steps.',
      },
    ];
  }

  if (writingSlugs.has(slug)) {
    return [
      {
        id: 'professional',
        label: ar ? 'احترافي' : 'Professional',
        instruction:
          'PROFESSIONAL MODE: Write polished, credible, specific copy with strong structure and no filler.',
      },
      {
        id: 'concise',
        label: ar ? 'مختصر' : 'Concise',
        instruction:
          'CONCISE MODE: Deliver the useful answer with minimal repetition while preserving critical information.',
      },
      {
        id: 'persuasive',
        label: ar ? 'إقناعي' : 'Persuasive',
        instruction:
          'PERSUASIVE MODE: Make the writing compelling and benefit-led without exaggeration, fake claims, or manipulative pressure.',
      },
      {
        id: 'friendly',
        label: ar ? 'ودود وطبيعي' : 'Friendly',
        instruction:
          'FRIENDLY MODE: Use clear natural language that feels human and approachable while remaining accurate and useful.',
      },
    ];
  }

  if (analysisSlugs.has(slug)) {
    return [
      {
        id: 'balanced',
        label: ar ? 'متوازن' : 'Balanced',
        instruction:
          'BALANCED MODE: Give a structured answer that separates facts, interpretation, uncertainty, and practical next steps.',
      },
      {
        id: 'deep',
        label: ar ? 'تحليل عميق' : 'Deep analysis',
        instruction:
          'DEEP MODE: Analyze carefully, surface assumptions and tradeoffs, and explain them at a useful level without inventing facts.',
      },
      {
        id: 'concise',
        label: ar ? 'مختصر' : 'Concise',
        instruction:
          'CONCISE MODE: Return only the most decision-relevant information with minimal repetition.',
      },
    ];
  }

  return [
    {
      id: 'balanced',
      label: ar ? 'متوازن' : 'Balanced',
      instruction:
        'BALANCED MODE: Be accurate, useful, well structured, and appropriately detailed.',
    },
    {
      id: 'concise',
      label: ar ? 'مختصر' : 'Concise',
      instruction:
        'CONCISE MODE: Keep the response compact while preserving important information.',
    },
    {
      id: 'detailed',
      label: ar ? 'تفصيلي' : 'Detailed',
      instruction:
        'DETAILED MODE: Give a thorough, structured response with practical details and caveats where relevant.',
    },
  ];
}

export function getWorkspacePresets(
  slug: string,
  locale: WorkspaceLocale,
): WorkspacePreset[] {
  const ar = locale === 'ar';

  if (slug === 'image') {
    return ar
      ? [
          {
            id: 'img-1',
            title: 'حلل كما هو ظاهر',
            prompt:
              'حلّل الصورة كما هي ظاهرة أمامك، واذكر فقط ما يمكنك تأكيده بصريًا.',
          },
          {
            id: 'img-2',
            title: 'استخرج كل النص',
            prompt:
              'استخرج النصوص المقروءة من الصورة بدقة، وحافظ على الأسماء والأرقام كما تظهر.',
          },
          {
            id: 'img-3',
            title: 'راجع التصميم',
            prompt:
              'راجع التصميم بصريًا من حيث الترتيب والوضوح والمسافات والألوان والتسلسل البصري، ثم اقترح تحسينات محددة.',
          },
          {
            id: 'img-4',
            title: 'حلل لقطة الخطأ',
            prompt:
              'اقرأ لقطة الشاشة التقنية وحدد الأخطاء أو التحذيرات الظاهرة فقط، ثم وضح ما يمكن استنتاجه وما يحتاج إلى لوج إضافي.',
          },
        ]
      : [
          {
            id: 'img-1',
            title: 'Analyze visible content',
            prompt:
              'Analyze the image exactly as shown and state only what can be supported visually.',
          },
          {
            id: 'img-2',
            title: 'Extract all text',
            prompt:
              'Extract the legible text accurately and preserve visible names and numbers.',
          },
          {
            id: 'img-3',
            title: 'Review the design',
            prompt:
              'Review the visible hierarchy, clarity, spacing, color, and composition, then recommend concrete improvements.',
          },
          {
            id: 'img-4',
            title: 'Analyze error screenshot',
            prompt:
              'Read the technical screenshot, identify only visible errors or warnings, and separate confirmed evidence from what needs more logs.',
          },
        ];
  }

  if (slug === 'document') {
    return ar
      ? [
          {
            id: 'doc-1',
            title: 'ملخص تنفيذي',
            prompt:
              'اعمل ملخصًا تنفيذيًا للمستند مع أهم الحقائق والقرارات والأرقام.',
          },
          {
            id: 'doc-2',
            title: 'استخرج المطلوب',
            prompt:
              'استخرج المتطلبات والالتزامات والمهام المذكورة في المستند بشكل منظم.',
          },
          {
            id: 'doc-3',
            title: 'المخاطر والنواقص',
            prompt:
              'حدد المخاطر والتناقضات والمعلومات الناقصة أو غير الواضحة في المستند.',
          },
          {
            id: 'doc-4',
            title: 'حول لخطة عمل',
            prompt:
              'حوّل محتوى المستند إلى خطة عمل مرتبة حسب الأولوية بدون اختراع معلومات غير موجودة.',
          },
        ]
      : [
          {
            id: 'doc-1',
            title: 'Executive summary',
            prompt:
              'Create an executive summary preserving the most important facts, decisions, and numbers.',
          },
          {
            id: 'doc-2',
            title: 'Extract requirements',
            prompt:
              'Extract explicit requirements, obligations, tasks, and constraints in a structured format.',
          },
          {
            id: 'doc-3',
            title: 'Risks and gaps',
            prompt:
              'Identify contradictions, risks, ambiguous points, and missing information in the document.',
          },
          {
            id: 'doc-4',
            title: 'Turn into action plan',
            prompt:
              'Convert the document into a prioritized action plan without inventing missing information.',
          },
        ];
  }

  if (slug === 'code') {
    return ar
      ? [
          {
            id: 'code-1',
            title: 'امسك الخطأ',
            prompt:
              'راجع الكود والخطأ وحدد السبب الأقرب ثم ابعتلي الإصلاح الكامل.',
          },
          {
            id: 'code-2',
            title: 'راجع الأمان',
            prompt:
              'راجع الكود من ناحية الأمان والأخطاء المحتملة والحالات الطرفية واقترح تعديلات عملية.',
          },
          {
            id: 'code-3',
            title: 'اشرح ببساطة',
            prompt:
              'اشرح لي الكود ببساطة وما الذي يفعله جزءًا جزءًا.',
          },
          {
            id: 'code-4',
            title: 'حسن الكود',
            prompt:
              'حسّن الكود ليكون أنظف وأقوى وأسهل في الصيانة بدون تغيير السلوك المطلوب.',
          },
        ]
      : [
          {
            id: 'code-1',
            title: 'Find the bug',
            prompt:
              'Review the code and error, identify the most likely cause, then provide the complete fix.',
          },
          {
            id: 'code-2',
            title: 'Security review',
            prompt:
              'Review this code for security issues, edge cases, and practical improvements.',
          },
          {
            id: 'code-3',
            title: 'Explain simply',
            prompt:
              'Explain this code simply, section by section, including the important data flow.',
          },
          {
            id: 'code-4',
            title: 'Improve the code',
            prompt:
              'Refactor this code to be cleaner, safer, and easier to maintain without changing the required behavior.',
          },
        ];
  }

  return ar
    ? [
        {
          id: 'gen-1',
          title: 'اعمل أفضل نسخة',
          prompt:
            'اعمل أفضل نسخة ممكنة من المطلوب بشكل احترافي ومنظم.',
        },
        {
          id: 'gen-2',
          title: 'اختصر',
          prompt:
            'اختصر النتيجة مع الحفاظ على أهم المعلومات.',
        },
        {
          id: 'gen-3',
          title: 'طوّر النتيجة',
          prompt:
            'طوّر النتيجة السابقة واجعلها أقوى وأكثر احترافية وعملية.',
        },
        {
          id: 'gen-4',
          title: 'خطوات تنفيذ',
          prompt:
            'حوّل المطلوب إلى خطوات تنفيذ واضحة ومرتبة.',
        },
      ]
    : [
        {
          id: 'gen-1',
          title: 'Best version',
          prompt:
            'Create the strongest polished version of the requested result.',
        },
        {
          id: 'gen-2',
          title: 'Make it concise',
          prompt:
            'Make the result concise while preserving the most important information.',
        },
        {
          id: 'gen-3',
          title: 'Improve the result',
          prompt:
            'Improve the previous result so it is stronger, more professional, and more practical.',
        },
        {
          id: 'gen-4',
          title: 'Execution steps',
          prompt:
            'Turn the request into clear prioritized execution steps.',
        },
      ];
}
