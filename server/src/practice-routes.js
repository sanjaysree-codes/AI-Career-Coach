import { Assessment, Attempt, QuestionBank, QuestionHistory, Resume, User } from './models.js';
import {
  APTITUDE_QUESTIONS_PER_SESSION, DIFFICULTIES, QUESTION_COOLDOWN_DAYS,
  ensureCuratedQuestionBank, generateAptitudeQuestionAdditions, getQuestionHistory, isDuplicateQuestion, normalizeQuestionText, selectQuestions,
} from './question-bank.js';

function publicAssessment(assessment) {
  const output=assessment.toObject();
  output.questions=output.questions.map(question=>{
    const item=question.toObject?.()||{...question};
    delete item.answerIndex;delete item.explanation;delete item.hiddenTestCases;
    return item;
  });
  return output;
}

function toAssessmentQuestion(question) {
  return {
    questionId:question.questionId, difficulty:question.difficulty, topic:question.topic,
    text:question.text, options:question.options, answerIndex:question.answerIndex, explanation:question.explanation,
    title:question.title, statement:question.statement, examples:question.examples,
    starterCode:question.starterCode, visibleTestCases:question.visibleTestCases, hiddenTestCases:question.hiddenTestCases,
  };
}

async function questionRecency(userId, questionIds, cutoff) {
  const history=await QuestionHistory.aggregate([
    {$match:{userId,questionId:{$in:questionIds}}},
    {$group:{_id:'$questionId',lastSeen:{$max:'$presentedAt'}}},
  ]);
  const lastSeen=new Map(history.map(row=>[row._id,row.lastSeen]));
  const recent=new Set(history.filter(row=>new Date(row.lastSeen)>=cutoff).map(row=>row._id));
  return {recent,lastSeen};
}

export async function recordQuestionPresentation({userId,attempt,assessment}) {
  const rows=(assessment.questions||[]).filter(question=>question.questionId).map(question=>({updateOne:{
    filter:{attemptId:attempt._id,questionId:question.questionId},
    update:{$setOnInsert:{userId,attemptId:attempt._id,assessmentId:assessment._id,questionId:question.questionId,roundType:assessment.roundType,difficulty:question.difficulty||assessment.difficulty,companyId:assessment.companyId,presentedAt:attempt.startedAt||new Date()}},
    upsert:true,
  }}));
  if(rows.length)await QuestionHistory.bulkWrite(rows,{ordered:false});
}

export async function recordQuestionOutcomes({userId,attempt,assessment,outcomes}) {
  const rows=(assessment.questions||[]).filter(question=>question.questionId).map((question,index)=>{
    const outcome=outcomes[index]||{};
    return {updateOne:{
      filter:{attemptId:attempt._id,questionId:question.questionId},
      update:{$set:{userId,attemptId:attempt._id,assessmentId:assessment._id,questionId:question.questionId,roundType:assessment.roundType,difficulty:question.difficulty||assessment.difficulty,companyId:assessment.companyId,attemptedAt:outcome.attempted===false?null:new Date(),score:outcome.score??null,outcome:outcome.outcome||'Submitted'},$setOnInsert:{presentedAt:attempt.startedAt||new Date()}},
      upsert:true,
    }};
  });
  if(rows.length)await QuestionHistory.bulkWrite(rows,{ordered:false});
}

export async function backfillLegacyQuestionHistory(userId,bank) {
  const user=await User.findById(userId).select('questionHistoryBackfilledAt');
  if(!user||user.questionHistoryBackfilledAt)return;
  const attempts=await Attempt.find({userId}).populate('assessmentId').sort({createdAt:1});
  const byId=new Map(bank.map(question=>[question.questionId,question]));
  const writes=[];
  for(const attempt of attempts){
    const assessment=attempt.assessmentId;
    if(!assessment)continue;
    for(let index=0;index<(assessment.questions||[]).length;index++){
      const snapshot=assessment.questions[index];
      let matched=snapshot.questionId?byId.get(snapshot.questionId):null;
      if(!matched&&assessment.roundType==='coding'&&normalizeQuestionText(snapshot.title).includes('two sum'))matched=byId.get('code-e-two-sum');
      if(!matched){
        const wording=snapshot.text||snapshot.title||snapshot.statement||'';
        matched=bank.find(question=>question.roundType===assessment.roundType&&isDuplicateQuestion({text:wording},[{text:question.text||question.title||question.statement||''}]));
      }
      if(!matched)continue;
      const detail=attempt.evaluation?.details?.[index];
      const completed=attempt.status==='completed';
      let attemptedAt=null,score=null,outcome='Not submitted';
      if(completed&&assessment.roundType==='aptitude'&&detail){
        if(detail.selected!==null&&detail.selected!==undefined){attemptedAt=attempt.submittedAt||attempt.updatedAt;score=detail.isCorrect?100:0;outcome=detail.isCorrect?'Correct':'Incorrect'}
        else{score=0;outcome='Unanswered'}
      }else if(completed&&assessment.roundType==='coding'){
        attemptedAt=attempt.submittedAt||attempt.updatedAt;score=attempt.score??null;outcome=attempt.evaluation?.status||'Submitted';
      }
      writes.push({updateOne:{filter:{attemptId:attempt._id,questionId:matched.questionId},update:{$setOnInsert:{userId,attemptId:attempt._id,assessmentId:assessment._id,questionId:matched.questionId,roundType:assessment.roundType,difficulty:matched.difficulty,companyId:assessment.companyId,presentedAt:attempt.startedAt||attempt.createdAt||new Date(),attemptedAt,score,outcome}},upsert:true}});
    }
  }
  if(writes.length)await QuestionHistory.bulkWrite(writes,{ordered:false});
  user.questionHistoryBackfilledAt=new Date();
  await user.save();
}

export function registerPracticeRoutes(api,{auth,ok,fail,companies,geminiJson}) {
  api.post('/companies/:companyId/assessments/generate',auth,async(req,res)=>{
    const company=companies.find(item=>item.companyId===req.params.companyId);
    if(!company)return fail(res,404,'Company track not found.');
    const roundType=req.body.roundType;
    if(!['aptitude','coding'].includes(roundType))return fail(res,400,'Choose an aptitude or coding practice session.');
    const difficulty=String(req.body.difficulty||'easy').toLowerCase();
    if(!DIFFICULTIES.includes(difficulty))return fail(res,400,'Choose Easy, Medium, or Hard difficulty.');
    const resume=await Resume.findOne({userId:req.user._id,analysisStatus:'complete'});
    if(!resume)return fail(res,409,'Complete your resume review before starting a company track.');
    if(roundType==='coding'){
      const prior=await Attempt.find({userId:req.user._id,status:'completed'}).populate('assessmentId');
      if(!prior.some(item=>item.assessmentId?.roundType==='aptitude'&&item.assessmentId?.companyId===company.companyId))return fail(res,409,'Complete the aptitude round before starting coding practice.');
    }

    await ensureCuratedQuestionBank();
    const allBank=await QuestionBank.find({active:true}).lean();
    await backfillLegacyQuestionHistory(req.user._id,allBank);
    let bank=await QuestionBank.find({roundType,difficulty,active:true}).lean();
    if(!bank.length)return fail(res,503,'No questions are available at this difficulty yet. Please choose another level.');
    const cooldown=new Date(Date.now()-QUESTION_COOLDOWN_DAYS*24*60*60*1000);
    let {recent,lastSeen}=await questionRecency(req.user._id,bank.map(item=>item.questionId),cooldown);
    if(roundType==='aptitude'){
      const available=bank.filter(item=>!recent.has(item.questionId)).length;
      const missing=APTITUDE_QUESTIONS_PER_SESSION-available;
      if(missing>0){
        try{
          await generateAptitudeQuestionAdditions({existing:bank,difficulty,count:missing,geminiJson});
          bank=await QuestionBank.find({roundType,difficulty,active:true}).lean();
          ({recent,lastSeen}=await questionRecency(req.user._id,bank.map(item=>item.questionId),cooldown));
        }catch{
          // Curated questions remain available when optional generation is unavailable.
        }
      }
    }
    const selected=selectQuestions(bank,recent,roundType==='aptitude'?APTITUDE_QUESTIONS_PER_SESSION:1,Math.random,lastSeen);
    if(!selected.length)return fail(res,503,'No unused questions are available right now. Please try again later.');
    const assessment=await Assessment.create({
      companyId:company.companyId,companyName:company.name,targetRole:req.user.targetRole||'Software Engineer',
      roundType,title:`${company.name} ${difficulty} ${roundType} practice`,difficulty,
      questionSource:selected.some(item=>item.source==='gemini')?'curated-and-gemini':'curated',
      questions:selected.map(toAssessmentQuestion),durationSeconds:roundType==='aptitude'?600:3600,
    });
    return ok(res,{assessment:{id:assessment._id,roundType:assessment.roundType,title:assessment.title,companyId:assessment.companyId,difficulty:assessment.difficulty,durationSeconds:assessment.durationSeconds,questions:publicAssessment(assessment).questions}},201);
  });

  api.get('/question-history',auth,async(req,res)=>{
    const limit=Math.min(200,Math.max(1,Number(req.query.limit)||100));
    return ok(res,{items:await getQuestionHistory(req.user._id,limit)});
  });
}

