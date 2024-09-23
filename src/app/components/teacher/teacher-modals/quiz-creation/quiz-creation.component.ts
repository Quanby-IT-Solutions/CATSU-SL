import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { lastValueFrom } from 'rxjs';
import {v4 as uuidv4} from 'uuid';
import { APIService } from 'src/app/services/API/api.service';
import { duration } from 'html2canvas/dist/types/css/property-descriptors/duration';

@Component({
  selector: 'app-quiz-creation',
  templateUrl: './quiz-creation.component.html',
  styleUrls: ['./quiz-creation.component.css'],
})
export class QuizCreationComponent implements OnInit {
  @Input() myCustomClass: string = '';
  @Input() quiz: any = null;
  @Input() courses: any = [];
  course: string = '';
  title: string = '';
  description: string = '';
  timelimit?: number;
  deadline: string = '';
  attachments?: File;
  settings: any = {
    random_question: false,
    allow_backtrack: false,
    allow_review: false,
    popup_quiz: false,
  };

  loading:boolean = false;

  types: Array<string> = ['Multiple Choice', 'True/False', 'Identification', 'Essay'];
  removeList:string[] = [];
  questions: any = [
    {
      type: '0',
      question: {value:'', attachments: []},
      options: [{value:'', attachment:null, active:false}, {value:'', attachment:null, active:false}, {value:'', attachment:null, active:false}, {value:'', attachment:null, active:false}],
      answer: '',
    },
  ];

  constructor(public activeModal: NgbActiveModal, private API: APIService) {}

  ngOnInit(): void {
    if(this.quiz){
      this.API.showSnackbar('Loading items, please wait....', undefined, 999999999);
      this.loading= true;
      this.questions = [];
      this.course = this.quiz.courseid;
      this.title = this.quiz.title;
      this.description = this.quiz.details;
      this.timelimit = this.quiz.timelimit;
      this.deadline = this.quiz.deadline;
      this.attachments = this.quiz.attachments;
      this.quiz.settings = this.quiz.settings ?? ''
      this.settings ={
        random_question: this.quiz.settings.includes('random_question'),
        allow_backtrack: this.quiz.settings.includes('allow_backtrack'),
        allow_review: this.quiz.settings.includes('allow_review'),
        popup_quiz: this.quiz.settings.includes('popup_quiz'),
      }
      

      // load the items;
      const items$ =  this.API.teacherGetQuizItems(this.quiz.id).subscribe(data=>{
        if(data.success){
          this.questions = data.output.reduce((acc:any,curr:any)=>{
            const [question, attachments] = curr.question.split('::::');
            let optCounter = -1;
            let options
            if(Number(curr.type <= 1)){
             options = curr.options.split('\\n\\n').reduce((oacc:any,ocurr:any)=>{
                const [option, attachment] = ocurr.split('::::');
                optCounter +=1;
                if(optCounter > 3){
                  return oacc
                }
                return [...oacc, {
                  value: option,
                  attachment: attachment == '' ? null : this.API.getURL(attachment),
                  active: curr.answer.includes(optCounter)
                }]
              },[]);
            }
            return [...acc, {
              id: curr.id,
              type: curr.type,
              question: {value:question, attachments: attachments.split('\\n\\n').reduce((acc:any, curr:any)=>{
                if(curr.trim() == ''){
                  return acc;
                }
                return [...acc, this.API.getURL(curr)]
              },[])},
              options: options,
              answer: curr.answer,
            }]
          },[]);
          this.API.successSnackbar('Items loaded!')
        }else{
          this.API.failedSnackbar('Error getting quiz items, refrain from editing quiz.')
        }
        this.loading = false;
        items$.unsubscribe();
      })
    }
  }

  selectedFileName: string | undefined;
  questionOnFileSelected(event: Event,question:any): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files) {
      const reader = new FileReader();
      reader.onload = () => {
        question.attachments.push(reader.result);
        console.log(question.attachments)
      };
      reader.readAsDataURL(inputElement.files[0]);
     
    }
  }

  optionOnFileSelected(event: Event, option:any){
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files) {
      const reader = new FileReader();
      reader.onload = () => {
        option.attachment= reader.result;
        console.log('ADDED');
      };
      reader.readAsDataURL(inputElement.files[0]);
    }
  }

  removeOptionAttachment(option:any){
    if(!confirm("Are you sure you want to remove this attachment?")){
      return;
    }
    option.attachment = null;
  }

  removeQuestionAttachment(question:any, index:number){
    if(!confirm("Are you sure you want to remove this attachment?")){
      return;
    }
    question.attachments.splice(index,1);
  }

  removeQuestion(index:number){
    if(!confirm("Are you sure you want to remove this question?")){
      return;
    }
    if(this.questions[index].id){
      this.removeList.push(this.questions[index].id);
    }
    this.questions.splice(index,1);
  }

  setMultipleAnswer(answer: string, question: any) {
    if (!(question.answer as string).includes(answer)) {
      question.answer += ' ' + answer;
      question.answer = question.answer.trim();
    } else {
      question.answer = (question.answer as string)
        .replaceAll(answer, '')
        .trim();
    }
  }

  setTFAnswer(answer: string, question: any) {
    question.answer = answer;
  }

  setType(question: any) {
    if(question.type == '3'){
      question.answer = '{{auto-checked}}';
    }else{
      question.answer = '';
    }
  }

  addNewItem() {
    this.questions.push({
      type: '0',
      question: {value:'', attachments: []},
      options: [{value:'', attachment:null, active:false}, {value:'', attachment:null, active:false}, {value:'', attachment:null, active:false}, {value:'', attachment:null, active:false}],
      answer: '',
    });
  }

  async uploadImage(file?:string){
    if(file == null){
      return null;
    }
    var filelocation = 'files/' +  uuidv4()+ '.png' ;
    this.API.uploadBase64(file, filelocation);
    return filelocation;
  }

  uploading: boolean = false;
  submit() {
    if (this.uploading) return;
    this.uploading = true;
    var settings: any = '';

    if(this.questions.length <= 0){
      this.API.failedSnackbar('Please add at least one question!');
      this.uploading = false;
      return;
    }

    if(this.timelimit == null || this.timelimit <= 0){
      this.API.failedSnackbar('Invalid time limit!');
      this.uploading = false;
      return;
    }

    for (let [key, active] of Object.entries(this.settings)) {
      if (active) {
        settings += ' ' + key;
        settings = settings.trim();
      }
    }

    if (settings.trim() == '') {
      settings = undefined;
    }
    var attachments = undefined;
    if (this.attachments != undefined) {
      var fileparse = this.attachments.name.split('.');
      var serverLocation =
        this.API.createID36() + '.' + fileparse[fileparse.length - 1];
      this.API.uploadFile(this.attachments, serverLocation);
      var filelocation = 'files/' + serverLocation;
      var filename = this.attachments.name;
      attachments = filelocation + '>' + filename;
    }
    if (
      !this.API.checkInputs([
        this.course,
        this.title,
        this.timelimit,
        this.deadline,
      ])
    ) {
      this.API.failedSnackbar('Please fill out all the header fields!');
      this.uploading = false;
      return;
    }
    for (let item of this.questions) {
      if (!this.API.checkInputs([(item.question.attachments.length > 0 ?'valid' : null) ?? item.question.value, item.answer])) {
        
        this.API.failedSnackbar(
          'Please fill out all the questions and answer fields!'
        );
        this.uploading = false;
        return;
      }
      if (item.type == '0') {
        if (!this.API.checkInputs(item.options.reduce((acc:any,curr:any)=>{
          return [ curr.attachment ?? curr.value,...acc]
        }, []))) {
          console.log(item);
          this.API.failedSnackbar(
            'Please fill out all the question options fields!'
          );
          this.uploading = false;
          return;
        }
      }
    }
    const id = this.API.createID32();
    this.API.justSnackbar('Saving ... ', 999999999);
    if(this.quiz){
      this.API.updateQuiz(
        this.course,
        this.quiz.id,
        this.title,
        this.description,
        this.timelimit!,
        this.deadline,
        attachments,
        settings
      ).subscribe(async () => {
        for (let item of this.questions) {
          var options: any = undefined;
          if (item.type == '0') {
            // check all options
            options = '';
            for (let option of item.options) {
              let link;
              if(option.attachment?.includes('base64') && option.attachment?.includes('data:image')){
                link = await this.uploadImage(option.attachment);
              }else{
                link = option.attachment;
              }
              
              options += option.value +`::::${link??''}` + '\\n\\n' ;
            }
          }
  
          // get all attachment in question
  
          var questionAttachments = '::::';
          for(let attachment of item.question.attachments){
            let link;
              if(attachment.includes('base64') && attachment.includes('data:image')){
                link = await this.uploadImage(attachment);
              }else{
                link = attachment;
              }
            if(questionAttachments == '::::'){
              questionAttachments += link
            }else{
              questionAttachments += '\\n\\n'+link
            }
          }
  
          if(item.id){
            await lastValueFrom(
              this.API.updateQuizItem(
                item.id,
                item.type,
                item.question.value + questionAttachments,
                item.answer,
                options
              )
            );
          }else{
            await lastValueFrom(
              this.API.createQuizItem(
                this.quiz.id,
                item.type,
                item.question.value + questionAttachments,
                item.answer,
                options
              )
            );
          }
        }

        for(let item of this.removeList){
          await lastValueFrom(this.API.deleteQuizItem(item));
        }
        this.API.successSnackbar('Saved quiz!');
        this.activeModal.close('update');
      });
    }else{
      this.API.createQuiz(
        this.course,
        id,
        this.title,
        this.description,
        this.timelimit!,
        this.deadline,
        attachments,
        settings
      ).subscribe(async () => {
        for (let item of this.questions) {
          var options: any = undefined;
          if (item.type == '0') {
            // check all options
            options = '';
            for (let option of item.options) {
              const link = await this.uploadImage(option.attachment);
              options += option.value +`::::${link??''}` + '\\n\\n' ;
            }
          }
  
          // get all attachment in question
  
          var questionAttachments = '::::';
          for(let attachment of item.question.attachments){
            const link = await this.uploadImage(attachment);
            if(questionAttachments == '::::'){
              questionAttachments += link
            }else{
              questionAttachments += '\\n\\n'+link
            }
          }
  
          await lastValueFrom(
            this.API.createQuizItem(
              id,
              item.type,
              item.question.value + questionAttachments,
              item.answer,
              options
            )
          );
        }
        this.API.successSnackbar('Saved quiz!');
        this.API.notifyStudentsInCourse(
          `${this.API.getFullName()} uploaded a new quiz.`,
          `${this.API.getFullName()} uploaded a new quiz titled, <b>'${
            this.title
          }'</b>. Make sure to study before the quiz! The quiz is due on <b>${this.API.parseDate(
            this.deadline
          )}</b>.`,
          this.course
        );
        this.activeModal.close('update');
      });
    }

    if (!this.isTimeLimitValid()) {
      this.API.failedSnackbar('Time limit must be greater than zero!');
      return;
    }
  }
  isTimeLimitValid(): boolean {
    return this.timelimit !== undefined && this.timelimit > 0;
  }

  closeModal() {
    this.activeModal.close();
    // You can pass any data you want back to the calling component here
  }

  showAIModal: boolean = false;
  aiPrompt: string = '';  
  aiGeneratedQuestion: string = '';  
  isGenerated: boolean = false;  

  async generateEssayQuestion() {
    if (!this.aiPrompt.trim()) {
      this.API.failedSnackbar('Please provide a topic to generate a question!');
      return;
    }

    const prompt = `Give me an essay question using this topic: ${this.aiPrompt}. 
    Minimum 1 sentence, Maximum 2 sentences question.`;

    try {
      this.API.justSnackbar('Generating question, please wait...');
      this.aiGeneratedQuestion = await this.API.analyzeEssay(prompt);
      this.API.successSnackbar('Question generated successfully!');
      this.isGenerated = true;
    } catch (error) {
      this.API.failedSnackbar('Error generating the question. Please try again.');
    }
  }

  useGeneratedQuestion() {
    if (this.aiGeneratedQuestion) {
      const currentEssayQuestion = this.questions.find((q: { type: string; }) => q.type === '3');
      if (currentEssayQuestion) {
        currentEssayQuestion.question.value = this.aiGeneratedQuestion;
      }
      this.showAIModal = false;  
    }
  }

}
