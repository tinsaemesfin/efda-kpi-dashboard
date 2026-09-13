/* Shared builders for the active MA report catalogue. No database access here. */
const PRODUCTS = [
  { key: 'medicine', code: 'MDCN', face: [8,155], standard: [[9,10,11,13],[160,161,162,163]], time: [[179,180,181],[118,119,120]], par: [[194,195],[114,109]] },
  { key: 'food', code: 'FD', face: [14,156], standard: [[18,19,20,21],[164,165,166,167]], time: [[182,183,184],[96,97,98]], par: [[196,197],[115,110]] },
  { key: 'foodNotification', code: 'FD', face: [15,157], standard: [[89,90,91,92],[168,169,170,171]], time: [[185,186,187],[99,100,101]], par: [[198,199],[108,111]] },
  { key: 'medicalDevice', code: 'MD', face: [16,158], standard: [[22,23,24,25],[172,173,174,175]], time: [[188,189,190],[102,103,104]], par: [[200,201],[116,112]] },
  { key: 'cosmetics', code: 'CO', face: [17,159], standard: [[93,94,95],[176,177,178]], time: [[191,192,193],[105,106,107]], par: [[202,203],[117,113]] },
];
const MARKER = '/* MA face/drilldown alignment v1 */';

// Find the end of a CTE without confusing parentheses inside SQL comments/strings.
function throughCte(sql, name) {
  const match = new RegExp(`\\b${name}\\s+AS\\s*\\(`, 'i').exec(sql);
  if (!match) throw new Error(`Missing CTE ${name}`);
  let depth=1, quote=false, line=false, block=0;
  for(let i=match.index+match[0].length;i<sql.length;i++) {
    const ch=sql[i], next=sql[i+1];
    if(line){if(ch==='\n')line=false;continue;}
    if(block){if(ch==='/'&&next==='*'){block++;i++;}else if(ch==='*'&&next==='/'){block--;i++;}continue;}
    if(quote){if(ch==="'"&&next==="'"){i++;}else if(ch==="'")quote=false;continue;}
    if(ch==='-'&&next==='-'){line=true;i++;continue;}
    if(ch==='/'&&next==='*'){block=1;i++;continue;}
    if(ch==="'"){quote=true;continue;}
    if(ch==='(')depth++;
    if(ch===')'&&--depth===0)return sql.slice(0,i+1);
  }
  throw new Error(`Unclosed CTE ${name}`);
}

function dateMetadata(report,basis,alias) {
  const filters=typeof report.filter_columns==='string'?JSON.parse(report.filter_columns):structuredClone(report.filter_columns);
  const f=filters.find(x=>x.ParameterName==='dateFilter');
  if(!f)throw new Error(`Missing date metadata: ${report.id}`);
  f.Alias=alias;f.OverridingFieldName=basis==='submission'?'submission_date':'decision_date';f.Title=basis==='submission'?'Submission date':'Decision date';
  return JSON.stringify(filters);
}

// Unqualified date fields are unambiguous at these source joins: the timing CTE
// exposes only id/time. This lets a composed face reuse ma/v source aliases.
function sourcePrefix(report,cte) {
  let q=throughCte(report.query,cte);
  if(!q.includes('@dateFilter'))throw new Error(`No date filter in source ${report.id}`);
  // Food and notification must be disjoint even when imported codes have spaces.
  q=q.replaceAll("COALESCE(v.ma_type_code, '') <> 'FNT'", "TRIM(COALESCE(v.ma_type_code, '')) <> 'FNT'");
  return q;
}

function standardSource(report) {
  const prefix=sourcePrefix(report,'classified');
  return `${prefix},
aligned_records AS (
  SELECT c.*,
    CASE WHEN c.module_code = 'NMR' AND c.pathway_group = 'Reliance pathway'
      THEN 90 ELSE c.target_days END AS effective_target_days
  FROM classified c
)
SELECT * FROM aligned_records`;
}

function categoryValues(time=false,par=false) {
  return `('Application type'::text, COALESCE(c.application_type_clean, 'Unspecified')::text),
      ('Internal regulatory pathway', CASE WHEN c.pathway_group = 'Internal regulatory pathway' THEN COALESCE(c.approval_pathway_clean, 'Unspecified') END),
      ('Reliance pathway', CASE WHEN c.pathway_group = 'Reliance pathway' THEN COALESCE(c.approval_pathway_clean, 'Unspecified') END),
      ('Regulatory outcome', COALESCE(${par?'c.regulatory_outcome':'c.regulatory_outcome_clean'}, c.ma_status_code, 'Unspecified')),
      ('MA type', COALESCE(${par?'c.ma_type_code':'c.ma_type_clean'}, c.ma_type_code, 'Unspecified')),
      ('${par?'Publication':time?'Decision':'Processing'} time band', c.${par?'publication_band':time?'decision_band':'processing_band'})${par?",\n      ('Application module', c.module_code)":''}`;
}

function standardDrilldown(source) {
  return `${MARKER}
WITH records AS (${source}), categorized AS (
  SELECT c.module_code, c.processing_time_in_day, c.effective_target_days,
    CASE WHEN x.category_name = 'Reliance pathway' THEN c.effective_target_days ELSE c.target_days END AS target_days,
    x.category_name, x.category_value
  FROM records c CROSS JOIN LATERAL (VALUES ${categoryValues()}) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name, category_value, module_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;`;
}

function standardFace(sources,code) {
  // Reuse the expensive regulatory timing view once for all face modules.
  // Fixture sources without that view still use exactly the same aggregation.
  const hasTiming=sources.every(s=>/\bunified_processing_time\s+AS\s*\(/i.test(s));
  let shared='';
  if(hasTiming){
    const timing=s=>throughCte(s,'unified_processing_time').replace(/^\s*WITH(?:\s+RECURSIVE)?\s+/i,'');
    const normalize=s=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/--[^\n]*/g,'').replace(/\s+/g,'');
    if(sources.some(s=>normalize(timing(s))!==normalize(timing(sources[0]))))throw new Error('Standard reports disagree on the regulatory clock');
    shared=timing(sources[0])+',\n';
    sources=sources.map(s=>{
      const first=throughCte(s,'unified_processing_time');
      return 'WITH RECURSIVE '+s.slice(first.length).replace(/^\s*,\s*/,'');
    });
  }
  const ctes=shared+sources.map((s,i)=>`part_${i} AS (${s})`).join(',\n');
  return `${MARKER}\nWITH ${ctes}, records AS (
${sources.map((_,i)=>`SELECT module_code, target_days, processing_time_in_day, effective_target_days FROM part_${i}`).join('\nUNION ALL\n')}
)
SELECT module_code, '${code}'::text AS submoduletype_code, target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND effective_target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM records GROUP BY module_code,target_days ORDER BY module_code;`;
}

function timeDrilldown(report,faceSource) {
  const oldBase=throughCte(report.query,'base');
  let q=faceSource+report.query.slice(oldBase.length);
  // The source snapshots use consistent newline formatting; fail closed on drift.
  if(!q.includes('categorized AS'))throw new Error(`Missing time categories ${report.id}`);
  q=q.replace("CASE WHEN x.category_name = 'Reliance pathway' THEN 90 ELSE c.target_days END AS target_days",
    "CASE WHEN x.category_name = 'Reliance pathway' THEN 90 ELSE c.target_days END AS target_days, CASE WHEN c.pathway_group = 'Reliance pathway' THEN 90 ELSE c.target_days END AS effective_target_days");
  q=q.replaceAll('decision_time_in_days <= target_days','decision_time_in_days <= effective_target_days')
    .replaceAll('decision_time_in_days > target_days * 2','decision_time_in_days > effective_target_days * 2')
    .replaceAll("('Application type'::text, c.application_type_clean::text)","('Application type'::text, COALESCE(c.application_type_clean, c.application_type, 'Unspecified')::text)")
    .replaceAll("('MA type'::text, c.ma_type_clean::text)","('MA type'::text, COALESCE(c.ma_type_clean, c.ma_type_code, 'Unspecified')::text)");
  // Add exact distribution summaries to both time reports without changing cohorts.
  const distribution = [
    'ROUND(MIN(decision_time_in_days)::numeric, 2) AS distribution_min_days',
    'ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q1_days',
    'ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_median_days',
    'ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY decision_time_in_days)::numeric, 2) AS distribution_q3_days',
    'ROUND(MAX(decision_time_in_days)::numeric, 2) AS distribution_max_days',
    'ROUND(AVG(decision_time_in_days)::numeric, 2) AS distribution_mean_days',
  ];
  if (!q.includes('FROM categorized')) throw new Error('Missing distribution aggregation');
  q = q.replace('FROM categorized', ',\n  ' + distribution.join(',\n  ') + '\nFROM categorized');
  return `${MARKER}\n${q}`;
}

function parDrilldown(report) {
  const prefix=sourcePrefix(report,'classified');
  return `${MARKER}\n${prefix}, categorized AS (
  SELECT c.module_code,c.target_days,c.processing_time_in_day,x.category_name,x.category_value
  FROM classified c CROSS JOIN LATERAL (VALUES ${categoryValues(false,true)}) x(category_name,category_value)
  WHERE x.category_value IS NOT NULL
)
SELECT category_name,category_value,module_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage,
  ROUND(AVG(processing_time_in_day) FILTER (WHERE processing_time_in_day>=0)::numeric,2) AS avg_processing_days
FROM categorized GROUP BY category_name,category_value,module_code,target_days
ORDER BY category_name,category_value,module_code;`;
}

function parFace(source,code) {
  return `${MARKER}\n${source}
SELECT module_code,'${code}'::text AS submoduletype_code,target_days,
  COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days) AS on_time_count,
  COUNT(*) AS total_count,
  ROUND((COUNT(*) FILTER (WHERE processing_time_in_day BETWEEN 0 AND target_days)*100.0/NULLIF(COUNT(*),0))::numeric,2) AS percentage
FROM base GROUP BY module_code,target_days ORDER BY module_code;`;
}

function buildAlignment(catalog) {
  const byId=new Map(catalog.map(r=>[r.id,r]));const result=[];
  const get=id=>{const r=byId.get(id);if(!r)throw new Error(`Missing report ${id}`);return r;};
  function add(id,query,basis,product,kind,alias='') {
    const old=get(id);result.push({...old,product,kind,basis,previous_query:old.query,previous_filter_columns:old.filter_columns,query,filter_columns:dateMetadata(old,basis,alias)});
  }
  for(const p of PRODUCTS) for(const [index,basis] of ['submission','decision'].entries()) {
    // Always derive both date variants from the same submission-source SQL.
    const sources=p.standard[0].map(id=>standardSource(get(id)));
    add(p.face[index],standardFace(sources,p.code),basis,p.key,'standard-face');
    p.standard[index].forEach((id,i)=>add(id,standardDrilldown(sources[i]),basis,p.key,`standard-${i+1}`));
    const timeFace=get(p.time[1][0]);const base=sourcePrefix(timeFace,'base');
    add(p.time[index][0],`${MARKER}\n${base}${timeFace.query.slice(throughCte(timeFace.query,'base').length)}`,basis,p.key,'time-face');
    for(const j of [1,2])add(p.time[index][j],timeDrilldown(get(p.time[1][j]),base),basis,p.key,j===1?'median':'average');
    const par=get(p.par[1][1]);
    add(p.par[index][0],parFace(sourcePrefix(par,'base'),p.code),basis,p.key,'par-face');
    add(p.par[index][1],parDrilldown(par),basis,p.key,'par-drilldown');
  }
  if(new Set(result.map(x=>x.id)).size!==result.length)throw new Error('Duplicate report ids');
  return result;
}
module.exports={PRODUCTS,MARKER,throughCte,buildAlignment,standardSource,standardDrilldown,standardFace};
