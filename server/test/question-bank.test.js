import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APTITUDE_QUESTIONS_PER_SESSION, CURATED_QUESTION_BANK, DIFFICULTIES,
  generateAptitudeQuestionAdditions, isDuplicateQuestion, selectQuestions,
} from '../src/question-bank.js';

const bankQuestion=(questionId,difficulty='easy')=>({questionId,difficulty});
const tokens=input=>input.trim()?input.trim().split(/\s+/):[];

function referenceOutput(id,input){
  const t=tokens(input).map(Number),n=t[0];
  switch(id){
    case 'code-e-two-sum':{const nums=t.slice(1,n+1),target=t[n+1],seen=new Map();for(let i=0;i<nums.length;i++){const j=seen.get(target-nums[i]);if(j!==undefined)return `${j} ${i}`;seen.set(nums[i],i)}return ''}
    case 'code-e-maximum':return String(Math.max(...t.slice(1,n+1)));
    case 'code-e-count-evens':return String(t.slice(1,n+1).filter(x=>x%2===0).length);
    case 'code-e-reverse-list':return t.slice(1,n+1).reverse().join(' ');
    case 'code-e-is-sorted':{const a=t.slice(1,n+1);return a.every((x,i)=>i===0||a[i-1]<=x)?'YES':'NO'}
    case 'code-m-rotate':{const k=t[1]%n,a=t.slice(2,n+2);return [...a.slice(n-k),...a.slice(0,n-k)].join(' ')}
    case 'code-m-first-unique':{const a=t.slice(1,n+1),counts=new Map();a.forEach(x=>counts.set(x,(counts.get(x)||0)+1));return String(a.find(x=>counts.get(x)===1)??-1)}
    case 'code-m-longest-run':{const a=t.slice(1,n+1);let best=1,run=1;for(let i=1;i<a.length;i++){run=a[i]>a[i-1]?run+1:1;best=Math.max(best,run)}return String(best)}
    case 'code-m-mode':{const counts=new Map();for(const x of t.slice(1,n+1))counts.set(x,(counts.get(x)||0)+1);return String([...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0])}
    case 'code-m-balanced-brackets':{const s=input.trim(),stack=[],pairs={')':'(',']':'[','}':'{'},open=new Set(Object.values(pairs));for(const ch of s){if(open.has(ch))stack.push(ch);else if(stack.pop()!==pairs[ch])return 'NO'}return stack.length?'NO':'YES'}
    case 'code-h-max-subarray':{const a=t.slice(1,n+1);let best=a[0],sum=a[0];for(const x of a.slice(1)){sum=Math.max(x,sum+x);best=Math.max(best,sum)}return String(best)}
    case 'code-h-lis':{const a=t.slice(1,n+1),dp=Array(n).fill(1);for(let i=0;i<n;i++)for(let j=0;j<i;j++)if(a[j]<a[i])dp[i]=Math.max(dp[i],dp[j]+1);return String(Math.max(...dp))}
    case 'code-h-min-coins':{const [count,amount]=t,coins=t.slice(2,2+count),dp=Array(amount+1).fill(Infinity);dp[0]=0;for(let x=1;x<=amount;x++)for(const c of coins)if(c<=x)dp[x]=Math.min(dp[x],dp[x-c]+1);return String(Number.isFinite(dp[amount])?dp[amount]:-1)}
    case 'code-h-shortest-path':{const [nodes,edges]=t,graph=Array.from({length:nodes+1},()=>[]);let i=2;for(let e=0;e<edges;e++){const a=t[i++],b=t[i++];graph[a].push(b);graph[b].push(a)}const source=t[i++],target=t[i],dist=Array(nodes+1).fill(-1),queue=[source];dist[source]=0;for(let j=0;j<queue.length;j++)for(const next of graph[queue[j]])if(dist[next]===-1){dist[next]=dist[queue[j]]+1;queue.push(next)}return String(dist[target])}
    case 'code-h-prefix-sums':{const [size,queries]=t,a=t.slice(2,2+size),prefix=[0];for(const x of a)prefix.push(prefix.at(-1)+x);const out=[];let i=2+size;for(let q=0;q<queries;q++){const left=t[i++],right=t[i++];out.push(prefix[right]-prefix[left-1])}return out.join('\n')}
    default:throw new Error(`No test reference for ${id}`);
  }
}

test('curated bank has distinct IDs, three levels, and reliable coding test fixtures',()=>{
  const ids=CURATED_QUESTION_BANK.map(question=>question.questionId);
  assert.equal(new Set(ids).size,ids.length);
  for(const difficulty of DIFFICULTIES){
    const aptitude=CURATED_QUESTION_BANK.filter(q=>q.roundType==='aptitude'&&q.difficulty===difficulty);
    const coding=CURATED_QUESTION_BANK.filter(q=>q.roundType==='coding'&&q.difficulty===difficulty);
    assert.equal(aptitude.length,10);
    assert.ok(coding.length>=4);
    for(const question of aptitude){assert.equal(question.options.length,4);assert.ok(question.answerIndex>=0&&question.answerIndex<4);assert.ok(question.explanation);}
    for(const question of coding){
      assert.ok(question.statement);
      assert.ok(question.examples.length>0);
      assert.equal(question.examples[0].output,question.visibleTestCases[0].expected);
      assert.ok(question.starterCode.javascript&&question.starterCode.python&&question.starterCode.java&&question.starterCode.c&&question.starterCode.cpp);
      assert.ok(question.visibleTestCases.length>=2);
      assert.ok(question.hiddenTestCases.length>=2);
      assert.ok([...question.visibleTestCases,...question.hiddenTestCases].every(row=>typeof row.input==='string'&&typeof row.expected==='string'));
    }
  }
  assert.equal(APTITUDE_QUESTIONS_PER_SESSION,5);
});

test('all visible and hidden coding fixtures match independent reference implementations',()=>{
  for(const question of CURATED_QUESTION_BANK.filter(item=>item.roundType==='coding')){
    for(const example of [...question.visibleTestCases,...question.hiddenTestCases]){
      const actual=referenceOutput(question.questionId,example.input).trim().replace(/\r\n/g,'\n');
      assert.equal(actual,example.expected.trim().replace(/\r\n/g,'\n'),`${question.questionId} input ${JSON.stringify(example.input)}`);
    }
  }
});

test('session selection excludes recent questions whenever fresh questions exist',()=>{
  const bank=[bankQuestion('q1'),bankQuestion('q2'),bankQuestion('q3')];
  const selected=selectQuestions(bank,new Set(['q1']),2,()=>0);
  assert.equal(selected.length,2);
  assert.ok(selected.every(q=>q.questionId!=='q1'));
});

test('when the pool is exhausted, selection chooses the oldest seen questions first',()=>{
  const bank=[bankQuestion('new'),bankQuestion('old')];
  const selected=selectQuestions(bank,new Set(['new','old']),1,()=>0,new Map([['new',new Date('2026-10-01')],['old',new Date('2026-01-01')]]));
  assert.equal(selected[0].questionId,'old');
});

test('question deduplication catches exact and near-identical wording',()=>{
  const existing=[{text:'A train travels 210 km in 3.5 hours. What is its average speed?'}];
  assert.equal(isDuplicateQuestion({text:existing[0].text.toUpperCase()},existing),true);
  assert.equal(isDuplicateQuestion({text:'A train travels 210 km in 3.5 hours. What is its average speed today?'},existing),true);
  assert.equal(isDuplicateQuestion({text:'What is the probability of drawing two red tokens without replacement?'},existing),false);
});

test('Gemini aptitude additions are validated and duplicates are rejected before persistence',async()=>{
  const persisted=[];
  const additions=await generateAptitudeQuestionAdditions({
    existing:[{text:'Existing aptitude question about percentages and discounts.'}],difficulty:'medium',count:1,
    geminiJson:async()=>({questions:[
      {text:'Existing aptitude question about percentages and discounts.',options:['A','B','C','D'],answerIndex:0,explanation:'Answer proof.',topic:'Percentages'},
      {text:'A new question about combining two independent work rates over several hours?',options:['4','6','8','12'],answerIndex:1,explanation:'Combine each rate and take the reciprocal.',topic:'Work rates'},
      {text:'An invalid item',options:['A','B'],answerIndex:0,explanation:'Too few options.',topic:'Logic'},
    ]}),
    persist:async rows=>persisted.push(...rows),
  });
  assert.equal(additions.length,1);
  assert.equal(persisted.length,1);
  assert.equal(additions[0].difficulty,'medium');
  assert.match(additions[0].questionId,/^apt-ai-/);
});
