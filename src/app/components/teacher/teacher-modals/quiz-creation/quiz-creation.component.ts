import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

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
  @Output() closed = new EventEmitter<void>();


  closeModal() {
    this.closed.emit(); // Emit event to notify the parent component to close the modal
  }

  @Input() myCustomClass: string = '';
  @Input() quiz: any = null;
  @Input() courses: any = [];



  course: string = '';
  lesson: string = '';
  selectedClassID: string = '';
  topic: string = '';
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
  lessons: any[] = [];
  topics: any[] = [];

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

  constructor( private API: APIService) {}


  // ngOnInit(): void {
  //   if(this.quiz){
  //     this.API.showSnackbar('Loading items, please wait....', undefined, 999999999);
  //     this.loading= true;


  //     this.questions = [];
  //     this.course = this.quiz.courseid;
  //     this.title = this.quiz.title;
  //     this.description = this.quiz.details;
  //     this.timelimit = this.quiz.timelimit;
  //     this.deadline = this.quiz.deadline;
  //     this.attachments = this.quiz.attachments;
  //     this.quiz.settings = this.quiz.settings ?? ''

  //     this.settings ={
  //       random_question: this.quiz.settings.includes('random_question'),
  //       allow_backtrack: this.quiz.settings.includes('allow_backtrack'),
  //       allow_review: this.quiz.settings.includes('allow_review'),
  //       popup_quiz: this.quiz.settings.includes('popup_quiz'),
  //     }


  //     // load the items;
  //     const items$ =  this.API.teacherGetQuizItems(this.quiz.id).subscribe(data=>{
  //       if(data.success){
  //         this.questions = data.output.reduce((acc:any,curr:any)=>{
  //           const [question, attachments] = curr.question.split('::::');
  //           let optCounter = -1;
  //           let options
  //           if(Number(curr.type <= 1)){
  //            options = curr.options.split('\\n\\n').reduce((oacc:any,ocurr:any)=>{
  //               const [option, attachment] = ocurr.split('::::');
  //               optCounter +=1;
  //               if(optCounter > 3){
  //                 return oacc
  //               }
  //               return [...oacc, {
  //                 value: option,
  //                 attachment: attachment == '' ? null : this.API.getURL(attachment),
  //                 active: curr.answer.includes(optCounter)
  //               }]
  //             },[]);
  //           }
  //           return [...acc, {
  //             id: curr.id,
  //             type: curr.type,
  //             question: {value:question, attachments: attachments.split('\\n\\n').reduce((acc:any, curr:any)=>{
  //               if(curr.trim() == ''){
  //                 return acc;
  //               }
  //               return [...acc, this.API.getURL(curr)]
  //             },[])},
  //             options: options,
  //             answer: curr.answer,
  //           }]
  //         },[]);
  //         this.API.successSnackbar('Items loaded!')
  //       }else{
  //         this.API.failedSnackbar('Error getting quiz items, refrain from editing quiz.')
  //       }
  //       this.loading = false;
  //       items$.unsubscribe();
  //     })
  //   }
  // }

  ngOnInit(): void {
    if (this.quiz) {
      // Editing an existing quiz
      this.API.showSnackbar('Loading quiz details, please wait...', undefined, 999999999);
      this.loading = true;

      // Initialize quiz details
      this.course = this.quiz.courseid;
      this.title = this.quiz.title;
      this.description = this.quiz.details;
      this.timelimit = this.quiz.timelimit;
      this.deadline = this.quiz.deadline;
      this.attachments = this.quiz.attachments;

      // Initialize settings
      this.quiz.settings = this.quiz.settings ?? '';
      this.settings = {
        random_question: this.quiz.settings.includes('random_question'),
        allow_backtrack: this.quiz.settings.includes('allow_backtrack'),
        allow_review: this.quiz.settings.includes('allow_review'),
        popup_quiz: this.quiz.settings.includes('popup_quiz'),
      };

      // Load lessons, topics, and quiz items
      this.loadLessonsAndTopics().then(() => {
        this.loadQuizItems();
      });
    } else {
      // Creating a new quiz
      this.questions = [this.createNewQuestion()];
    }

    // Load all courses (this might be needed for both new and existing quizzes)
    this.loadClasses();
  }

  private async loadLessonsAndTopics(): Promise<void> {
    if (this.course) {
      try {
        // Load lessons for the selected course
        const lessonData = await this.API.teacherCourseLessons(this.course).toPromise();
        this.lessons = lessonData.output;

        // Set the lesson if it exists in the quiz
        if (this.quiz.lessonid) {
          this.lesson = this.quiz.lessonid;

          // Load topics for the selected lesson
          if (this.lesson) {
            const topicData = await this.API.getTopics(this.lesson).toPromise();
            this.topics = topicData.output;

            // Set the topic if it exists in the quiz
            if (this.quiz.topicid) {
              this.topic = this.quiz.topicid;
            }
          }
        }
      } catch (error) {
        console.error('Error loading lessons and topics:', error);
        this.API.failedSnackbar('Failed to load lessons and topics. Please try again.');
      }
    }
  }

  private loadQuizItems(): void {
    this.API.teacherGetQuizItems(this.quiz.id).subscribe(
      data => {
        if (data.success) {
          this.questions = data.output.map((item: any) => {
            const [question, attachments] = item.question.split('::::');
            let options;

            if (Number(item.type) <= 1) {
              options = item.options.split('\\n\\n').map((option: string, index: number) => {
                const [value, attachment] = option.split('::::');
                return {
                  value: value,
                  attachment: attachment ? this.API.getURL(attachment) : null,
                  active: item.answer.includes(index.toString())
                };
              }).slice(0, 4);  // Ensure we only have 4 options
            }

            return {
              id: item.id,
              type: item.type,
              question: {
                value: question,
                attachments: attachments.split('\\n\\n').filter((url: string) => url.trim() !== '').map((url: string) => this.API.getURL(url))
              },
              options: options,
              answer: item.answer,
            };
          });

          this.API.successSnackbar('Quiz items loaded successfully!');
        } else {
          this.API.failedSnackbar('Error loading quiz items. Some data may be missing.');
        }
        this.loading = false;
      },
      error => {
        console.error('Error fetching quiz items:', error);
        this.API.failedSnackbar('Failed to load quiz items. Please try again.');
        this.loading = false;
      }
    );
  }

  private loadCourses(): void {
    this.API.teacherAllCourses().subscribe(
      data => {
        if (data.success) {
          this.courses = data.output.map((course: any) => ({
            id: course.id,
            title: course.course,
          }));
        } else {
          this.API.failedSnackbar('Failed to load courses. Please refresh the page.');
        }
      },
      error => {
        console.error('Error fetching courses:', error);
        this.API.failedSnackbar('Failed to load courses. Please check your connection and try again.');
      }
    );
  }

  classes:any



  private loadClasses(): void {
    this.API.showLoader();
    this.API.teacherAllClasses().subscribe(data => {
      if (data.success) {
        this.classes = data.output.map((_class: any) => ({
          id: _class.id,  // Store the class ID
          courseid: _class.courseid,  // Store the course ID
          course: _class.course,
          class: _class.class
        }));
        console.log(this.classes);  // You will now see both class ID and course ID in the console
      } else {
        this.API.failedSnackbar('Unable to connect to the server.', 3000);
      }
      this.API.hideLoader();
    });
  }




  private createNewQuestion(): any {
    return {
      type: '0',
      question: { value: '', attachments: [] },
      options: [
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false },
        { value: '', attachment: null, active: false }
      ],
      answer: '',
    };
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

  // onCourseChange() {
  //   this.lesson = '';
  //   this.topic = '';
  //   this.topics = [];
  //   if (this.course) {
  //     this.API.teacherCourseLessons(this.course).subscribe(
  //       (data) => {
  //         this.lessons = data.output;
  //       },
  //       (error) => {
  //         console.error('Error fetching lessons:', error);
  //         this.API.failedSnackbar('Failed to fetch lessons for the selected course.');
  //       }
  //     );
  //   } else {
  //     this.lessons = [];
  //   }
  // }




  onCourseChange(selectedClass: any) {
    this.course = selectedClass.courseid;  // Set the selected courseid
    this.selectedClassID = selectedClass.id;  // Store the associated class ID

    this.lesson = '';
    this.topic = '';
    this.topics = [];

    // Load lessons based on the selected course
    if (this.course) {
      this.API.teacherCourseLessons(this.course).subscribe(
        (data) => {
          this.lessons = data.output;
        },
        (error) => {
          console.error('Error fetching lessons:', error);
          this.API.failedSnackbar('Failed to fetch lessons for the selected course.');
        }
      );
    } else {
      this.lessons = [];
    }
  }


  onLessonChange() {
    this.topic = '';
    if (this.lesson) {
      this.API.getTopics(this.lesson).subscribe(
        (data) => {
          this.topics = data.output;
        },
        (error) => {
          console.error('Error fetching topics:', error);
          this.API.failedSnackbar('Failed to fetch topics for the selected lesson.');
        }
      );
    } else {
      this.topics = [];
    }
  }


  async submit() {
    if (this.uploading) return;
    this.uploading = true;
    let settings: string = '';

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
      }
    }
    settings = settings.trim();

    let attachments = undefined;
    if (this.attachments) {
      const fileparse = this.attachments.name.split('.');
      const serverLocation = this.API.createID36() + '.' + fileparse[fileparse.length - 1];
      await this.API.uploadFileWithProgress(this.attachments, serverLocation);
      const filelocation = 'files/' + serverLocation;
      attachments = filelocation + '>' + this.attachments.name;
    }
    const quizData = {
      course: this.course,
      title: this.title,
      description: this.description,
      timelimit: this.timelimit!,
      deadline: this.deadline,
      attachments: attachments,
      settings: settings,
      lesson: this.lesson || undefined,
      topic: this.topic || undefined,
      classid: this.selectedClassID
    };
    try {
      if (this.quiz) {
        // Updating existing quiz
        await this.updateExistingQuiz(quizData);
      } else {
        // Creating new quiz
        await this.createNewQuiz(quizData);
      }
      this.API.successSnackbar('Quiz saved successfully!');
      this.closeModal();
    } catch (error) {
      console.error('Error saving quiz:', error);
      this.API.failedSnackbar('Failed to save quiz. Please try again.');
    } finally {
      this.uploading = false;
    }
  }
  private async updateExistingQuiz(quizData: any) {
    await lastValueFrom(this.API.updateQuiz(
      quizData.course,
      this.quiz.id,
      quizData.title,
      quizData.description,
      quizData.timelimit,
      quizData.deadline,
      quizData.attachments,
      quizData.settings,
      quizData.lesson,
      quizData.topic,
      quizData.classid
    ));

    await this.saveQuizItems(this.quiz.id);
  }

  private async createNewQuiz(quizData: any) {
    const id = this.API.createID32();
    await lastValueFrom(this.API.createQuiz(
      quizData.course,
      id,
      quizData.title,
      quizData.description,
      quizData.timelimit,
      quizData.deadline,
      quizData.attachments,
      quizData.settings,
      quizData.lesson,
      quizData.topic,
      quizData.classid
    ));

    await this.saveQuizItems(id);

    this.API.notifyStudentsInCourse(
      `${this.API.getFullName()} uploaded a new quiz.`,
      `${this.API.getFullName()} uploaded a new quiz titled, <b>'${quizData.title}'</b>. Make sure to study before the quiz! The quiz is due on <b>${this.API.parseDate(quizData.deadline)}</b>.`,
      quizData.course
    );
  }

  private async saveQuizItems(quizId: string) {
    for (let item of this.questions) {
      const options = await this.prepareQuestionOptions(item);
      const questionAttachments = await this.prepareQuestionAttachments(item.question);

      if (item.id) {
        await lastValueFrom(
          this.API.updateQuizItem(
            item.id,
            item.type,
            item.question.value + questionAttachments,
            item.answer,
            options
          )
        );
      } else {
        await lastValueFrom(
          this.API.createQuizItem(
            quizId,
            item.type,
            item.question.value + questionAttachments,
            item.answer,
            options
          )
        );
      }
    }

    for (let itemId of this.removeList) {
      await lastValueFrom(this.API.deleteQuizItem(itemId));
    }
  }

  private async prepareQuestionOptions(item: any): Promise<string | undefined> {
    if (item.type !== '0') return undefined;

    let options = '';
    for (let option of item.options) {
      let link = option.attachment;
      if (option.attachment?.includes('base64') && option.attachment?.includes('data:image')) {
        link = await this.uploadImage(option.attachment);
      }
      options += option.value + `::::${link ?? ''}` + '\\n\\n';
    }
    return options;
  }

  private async prepareQuestionAttachments(question: any): Promise<string> {
    let attachments = '::::';
    for (let attachment of question.attachments) {
      let link = attachment;
      if (attachment.includes('base64') && attachment.includes('data:image')) {
        link = await this.uploadImage(attachment);
      }
      attachments += (attachments === '::::' ? '' : '\\n\\n') + link;
    }
    return attachments;
  }




  isTimeLimitValid(): boolean {
    return this.timelimit !== undefined && this.timelimit > 0;
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
