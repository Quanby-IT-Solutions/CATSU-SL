import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  Renderer2,
  ElementRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { iif } from 'rxjs';
import { APIService } from 'src/app/services/API/api.service';
import { Japanese, English, French } from 'src/app/shared/model/models';
import { Location } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

const japanese = new Japanese();
const english = new English();
const french = new French();

interface QuizOption {
  id: number;
  text: string;
  attachment?:string
}
interface QuizItem {
analysisAnswer: any;
  analysisResult: string;
  type: number;
  question: string;
  attachments?: Array<string>;
  choices: Array<QuizOption>;
  correctAnswers: Array<any>;
  selectedAnswers: Array<any>;
}

@Component({
  selector: 'app-quiz-page',
  templateUrl: './quiz-page.component.html',
  styleUrls: ['./quiz-page.component.css'],
})
export class QuizPageComponent implements OnInit, OnDestroy {
  level?: number;

  questions: Array<QuizItem> = [];

  currentQuestionIndex = 0;
  correctAnswers = 0;
  timeRemaining = 180;
  showResult = false;
  timelimit = 180;
  timer: any;
  backtracking = true;
  review = true;
  randomize = true;
  teacherid = '';
  isButtonDisabled: boolean = false;
  private examInProgress: boolean = true;
  quizID: string = '';
  isPractice = false;
  mode = 'reading';
  lang = '';
  analyzing = false;





  
  isUserAnswerCorrect(question: any, selectedChoiceIndex: number): boolean {
    const correctAnswersSet: Set<number> = new Set(question.correctAnswers);
    const selectedAnswersSet: Set<number> = new Set(question.selectedAnswers);

    return (
      selectedChoiceIndex == question.selectedAnswers[0] ||
      this.matchText(question.correctAnswers[0], question.selectedAnswers[0])
    );
  }

  title: string = 'Welcome to the QLAB Language Proficiency Quiz!';
  description: string =
    'Test your skills and see how well you know the language. Choose the correct answers for each question. Good luck!';

  practiceID?: string;
  constructor(
    private API: APIService,
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private renderer: Renderer2,
    private el: ElementRef,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.correctAnswers = 0;
    const taskID = this.API.quizID;
  
    this.API.quizID = null;
    
    if (taskID == null) {
      this.API.showLoader();
      this.isPractice = true;
      const sessionObject = this.API.currentPractice;
      // set level
      this.level = sessionObject.id;
      this.mode = this.API.currentPractice.mode;
      this.practiceID = sessionObject.practiceID;
      if (sessionObject.title != null) {
        this.title = sessionObject.title;
      }
      if (sessionObject.description != null) {
        this.description = sessionObject.description;
      }
      this.API.currentPractice = null;
      // get content of level level
      if (sessionObject.lang == 'japanese') {
        for (let item of japanese.quizzes[this.level!].items) {
          const itemOptions: Array<QuizOption> = [];
          var i = 0;
          for (let option of item.options) {
            const newOption: QuizOption = {
              id: i,
              text: String.fromCharCode(65 + i) + '. ' + option,
            };
            itemOptions.push(newOption);
            i += 1;
          }
          const newitem: QuizItem = {
            type: 0,
            question: item.question,
            choices: itemOptions,
            correctAnswers: [item.options.indexOf(item.answer)],
            selectedAnswers: [],
            analysisResult: '',
            analysisAnswer: undefined
          };
          this.questions.push(newitem);
        }
      }
      if (sessionObject.lang == 'english') {
        for (let item of english.quizzes[this.level!].items) {
          const itemOptions: Array<QuizOption> = [];
          var i = 0;
          for (let option of item.choices) {
            const newOption: QuizOption = {
              id: i,
              text: String.fromCharCode(65 + i) + '. ' + option,
            };
            itemOptions.push(newOption);
            i += 1;
          }
          const newitem: QuizItem = {
            type: 0,
            question: item.question,
            choices: itemOptions,
            correctAnswers: [item.choices.indexOf(item.answer)],
            selectedAnswers: [],
            analysisResult: '',
            analysisAnswer: undefined
          };
          this.questions.push(newitem);
        }
      }
      if (sessionObject.lang == 'french') {
        for (let item of french.quizzes[this.level!].items) {
          const itemOptions: Array<QuizOption> = [];
          var i = 0;
          for (let option of item.choices) {
            const newOption: QuizOption = {
              id: i,
              text: String.fromCharCode(65 + i) + '. ' + option,
            };
            itemOptions.push(newOption);
            i += 1;
          }
          const newitem: QuizItem = {
            type: 0,
            question: item.question,
            choices: itemOptions,
            correctAnswers: [item.choices.indexOf(item.answer)],
            selectedAnswers: [],
            analysisResult: '',
            analysisAnswer: undefined
          };
          this.questions.push(newitem);
        }
      }
      this.toggleFullscreen();
  
      switch(sessionObject.lang){
        case 'english':
          this.lang = 'en';
          break;
        case 'japanese':
          this.lang = 'ja';
          break;
        case 'french':
          this.lang = 'fr'
          break;
        }
      this.questions = this.shuffle();
      this.textToSpeech();
      this.API.hideLoader();
    } else {
      this.quizID = taskID!;
      this.API.showLoader();
      this.API.studentGetQuiz(taskID).subscribe(
        (data) => {
          if (data.success) {
            this.title = data.output[0].title;
            this.teacherid = data.output[0].teacherid;
            this.description = data.output[0].details;
            this.timelimit = data.output[0].timelimit * 60;
            this.timeRemaining = this.timelimit;
            this.backtracking = false;
            this.randomize = false;
            this.review = false;
            if (data.output[0].settings) {
              this.backtracking =
                data.output[0].settings.includes('allow_backtrack');
              this.randomize =
                data.output[0].settings.includes('random_question');
              this.review = data.output[0].settings.includes('allow_review');
            }
            for (let item of data.output) {
              const itemOptions: Array<QuizOption> = [];
              var i = 0;
              var correctAnswers: any[] = [];
  
              if (item.type == '0') {
                for (let option of item.options.split('\\n\\n')) {
                  if (option.trim() == '') continue;
                  const [text, attachment]= option.split('::::');
                  const newOption: QuizOption = {
                    id: i,
                    text: String.fromCharCode(65 + i) + '. ' + text,
                    attachment: this.getUrl(attachment)
                  };
                  itemOptions.push(newOption);
                  i += 1;
                }
                for (let answer of item.answer.split(' ')) {
                  correctAnswers.push(Number(answer));
                }
              } else if (item.type == '1') {
                const tru: QuizOption = {
                  id: 0,
                  text: 'TRUE',
                };
                itemOptions.push(tru);
                const fals: QuizOption = {
                  id: 1,
                  text: 'False',
                };
                itemOptions.push(fals);
  
                if (item.answer == 'T') {
                  correctAnswers.push(0);
                } else {
                  correctAnswers.push(1);
                }
              } else {
                const asnwer: QuizOption = {
                  id: 0,
                  text: `${item.answer}`,
                };
                itemOptions.push(asnwer);
                correctAnswers.push(item.answer);
              }
  
              const selectedAnswers = [];
              if (Number(item.type) > 1) {
                selectedAnswers.push('');
              }
  
              //get attachments
              const [question, attachments] = item.question.split('::::');
  
              const newitem: QuizItem = {
                type: Number(item.type),
                question: question,
                attachments: attachments.split('\\n\\n').reduce((acc: any, item: any) => {
                  if (item.trim() == '') {
                    return acc;
                  }
                  return [...acc, this.getUrl(item)];
                }, []),
                choices: itemOptions,
                correctAnswers: correctAnswers,
                selectedAnswers: selectedAnswers,
                analysisResult: '',
                analysisAnswer: undefined
              };
              this.questions.push(newitem);
            }
            this.questions = this.shuffle();
            // student quiz is recorded when started to avoid re attempt on reload
            this.API.recordQuiz(
              this.quizID,
              this.correctAnswers,
              this.questions.length
            );
          } else {
            this.router.navigate(['/']);
          }
          this.questions = this.shuffle();
          this.toggleFullscreen();
          this.API.hideLoader();
        },
        (error) => {
          console.error('Error loading quiz:', error);
          this.API.failedSnackbar('Error loading quiz. Please try again.');
          this.API.hideLoader();
          this.router.navigate(['/']);
        }
      );
    }
  
    this.startTimer();
  }

generating = false;

textToSpeech(){
    if(this.generating) return;
    this.generating = true;
    if(this.mode !='listening') return;
    const talk$ = this.API.textToSpeech(this.questions[this.currentQuestionIndex].question, this.lang ).subscribe(data=>{
      this.generating = false;
      const audio = new Audio();
      audio.src = data.fileDownloadUrl ;
      audio.load();
      // this.loadVisuallizer(this.audio);
      audio!.play();
      talk$.unsubscribe();
    })
  }

  matchText(target: any, src: any) {
    if (typeof target == 'string' && typeof src == 'string') {
      return target.toLowerCase() == src.toLowerCase();
    } else {
      return false;
    }
  }

  getUrl(link:string){
    return this.API.getURL(link);
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  letterFromIndex(index: number) {
    return String.fromCharCode(65 + index);
  }

  startTimer() {
   if(this.mode!='listening'){
    this.timer = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
      } else {
        this.exitFullscreen();
        this.stopTimer();
        this.showResult = true;
        // this.checkAnswers();
        this.isButtonDisabled = true;
      }
    }, 1000);
   }
  }

  secondsToMinutes(seconds: number) {
    if (seconds < 60) {
      return seconds;
    }
    return (
      Math.floor(seconds / 60).toString() +
      ':' +
      (seconds % 60).toString().padStart(2, '0')
    );
  }

  stopTimer() {
    clearInterval(this.timer);
    this.removeMarginToClass();
  }

  selectAnswer(choiceId: number) {
    const question = this.questions[this.currentQuestionIndex];
    const selectedIndex = question.selectedAnswers.indexOf(choiceId);

    // For single-choice questions, reset and select the new answer
    if (question.type <= 1) {
      question.selectedAnswers = [choiceId];
    } else if (selectedIndex === -1) {
      // For multi-select, add the choice if not already selected
      question.selectedAnswers.push(choiceId);
    } else {
      // For multi-select, remove the choice if already selected
      question.selectedAnswers.splice(selectedIndex, 1);
    }
  }
  trackByFn(index: any, item: any) {
    return index; // or item.id
  }
  isAnswerCorrect(question: QuizItem, choiceId: number): boolean {
    return question.correctAnswers.includes(choiceId);
  }
  isAnswerIncorrect(question: QuizItem, choiceId: number): boolean {
    return (
      !this.isAnswerCorrect(question, choiceId) &&
      question.selectedAnswers.includes(choiceId)
    );
  }
  isQuestionUnanswered(question: QuizItem): boolean {
    return question.selectedAnswers.length === 0;
  }
  isUserSelectedAnswer(question: QuizItem, choiceId: number): boolean {
    return question.selectedAnswers.includes(choiceId);
  }

  shuffle() {
    if (!this.randomize) return this.questions;
    return this.questions.sort(() => Math.random() - 0.5);
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex === this.questions.length) {
      // this.stopTimer();
      // this.showResult = true;
      // this.checkAnswers();
      this.exitFullscreen();
    }else{
      this.textToSpeech();
    }
  }

  prevQuestion() {
    if (!this.backtracking) return;
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }


  //before gemini
  
  // checkAnswers() {
  //   this.questions.forEach((question) => {
  //     const correctAnswersSet = new Set(question.correctAnswers);
  //     const selectedAnswersSet = new Set(question.selectedAnswers);

  //     if (
  //       this.setsAreEqual(correctAnswersSet, selectedAnswersSet) ||
  //       this.matchText(question.selectedAnswers[0], question.correctAnswers[0])
  //     ) {
  //       this.correctAnswers++;
  //     }
  //   });
  //   if (this.isPractice) {
  //     this.API.recordAssessment(
  //       this.practiceID!,
  //       this.level! + 1,
  //       this.correctAnswers,
  //       this.questions.length,
  //       this.mode
  //     );
  //     if (this.correctAnswers >= this.questions.length) {
  //       this.API.updateLevel(this.practiceID!, this.level! + 1, this.mode);
  //     }
  //   } else {
  //     // record quiz
  //     this.API.updateQuizScore(this.quizID, this.correctAnswers);
  //     this.API.pushNotifications(
  //       `${this.API.getFullName()} finished a quiz`,
  //       `${this.API.getFullName()} finished a quiz titled <b>'${
  //         this.title
  //       }'</b>. Their score has been successfuly  recorded.`,
  //       this.teacherid
  //     );
  //   }
  // }

  // with gemini po

  getRealTotal(){
    return this.questions.reduce((acc:any, curr:any)=>{
      return curr.type == 3 ? acc + 5 : acc + 1
    },0);
  }

  async geminiCheckAnswer(question:any){
    const answer = question.selectedAnswers[0];

        // Store the user's answer
        question.analysisAnswer = answer;

        const prompt = `"Please evaluate the following question and answer. Based on the relevance and accuracy of the user's response, assign a score out of 5 points.

        Question: "${question.question}"
        User's Answer: "${answer}"
        
        Provide only the score (from 0 to 5 points)."
        `;

        try {
            const result = await this.API.analyzeEssay(prompt);
            return Number(result); 
        } catch (error) {
          if (error instanceof Error) {
              this.API.failedSnackbar(error.message, 99999999);
          } else {
              this.API.failedSnackbar('An unexpected error occurred.', 99999999);
          }
          question.analysisResult = 'Score: Not Available';
          return null;
        }
  }

  async checkAnswers() {
    this.API.showLoader();
    for (let question of this.questions){
      const correctAnswersSet = new Set(question.correctAnswers);
        const selectedAnswersSet = new Set(question.selectedAnswers);

        if(question.type == 3){
          const score = await this.geminiCheckAnswer(question);
          if(score == null){
            this.correctAnswers=0;
            this.checkAnswers();
            return;
          }
          this.correctAnswers += score!;
        }else{
          if (
              this.setsAreEqual(correctAnswersSet, selectedAnswersSet) ||
              this.matchText(question.selectedAnswers[0], question.correctAnswers[0])
          ) {
              this.correctAnswers++;
          } 
        }
    }

    if (this.isPractice) {
        this.API.recordAssessment(
            this.practiceID!,
            this.level! + 1,
            this.correctAnswers,
            this.getRealTotal(),
            this.mode
        );
        if (this.correctAnswers >= this.getRealTotal()) {
            this.API.updateLevel(this.practiceID!, this.level! + 1, this.mode);
        }
    } else {
        // Record quiz
        this.API.updateQuizScore(this.quizID, this.correctAnswers);
        this.API.pushNotifications(
            `${this.API.getFullName()} finished a quiz`,
            `${this.API.getFullName()} finished a quiz titled <b>'${
            this.title
        }'</b>. Their score has been successfully recorded.`,
            this.teacherid
        );
        
    }
    this.API.hideLoader();
}

  

  setsAreEqual(setA: Set<number>, setB: Set<number>): boolean {
    if (setA.size !== setB.size) {
      return false;
    }

    for (const item of setA) {
      if (!setB.has(item)) {
        return false;
      }
    }

    return true;
  }

  resetQuiz() {
    this.location.back();
    // Reset selected answers
    // this.questions.forEach((question) => {
    //   question.selectedAnswers = [];
    // });

    // this.currentQuestionIndex = 0;
    // this.correctAnswers = 0;
    // this.timeRemaining = this.timelimit;
    // this.showResult = false;
    // this.startTimer();
  }

  logout() {
    this.renderer.removeClass(document.body, 'min-[768px]:ml-64');
    this.API.logout();
  }

  toggleFullscreen() {
    const elem = this.el.nativeElement;
    this.checkScreenSize();
    if (!document.fullscreenElement) {
      const keydownListener = (e: KeyboardEvent) => {
        if (e.key === 'F11') {
          e.preventDefault();
          console.log('F11 key is disabled in fullscreen');
        }
      };
  
      document.addEventListener('keydown', keydownListener);
  
      elem.requestFullscreen().then(() => {
        console.log('Fullscreen');
        this.renderer.setStyle(document.body, 'overflow-y', 'auto');
        this.renderer.setStyle(document.body, 'height', '100%');
  
        document.addEventListener('fullscreenchange', () => {
          if (!document.fullscreenElement) {
            if(this.currentQuestionIndex < this.questions.length) {
              this.API.failedSnackbar('Quiz Interrupted due to exiting fullscreen');
            }
            document.removeEventListener('keydown', keydownListener);
            this.renderer.removeStyle(document.body, 'overflow-y');
            this.renderer.removeStyle(document.body, 'height');
            this.stopTimer();
            this.showResult = true;
            this.isButtonDisabled = true;
          }
        });
      }).catch((err: any) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    }
  }

  exitFullscreen() {
    if (document.fullscreenElement) {
      this.checkAnswers();
      
      document.exitFullscreen();
      
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    this.detectF11KeyPress(event);
  }

  detectF11KeyPress(event: KeyboardEvent): void {
    // if (
    //   (event.key === 'F11' && this.timeRemaining > 0) ||
    //   (event.key === 'Escape' && this.timeRemaining )
    // ) {
    //   this.exitFullscreen();
    //   // this.stopTimer();
    //   // this.showResult = true;
    //   // this.checkAnswers();
    //   // this.isButtonDisabled = true;
    //   this.API.failedSnackbar(
    //     'Quiz Interupted due to exiting fullscreen'
    //   );
    // }
  }

  disableAltTab() {
    document.addEventListener('keydown', (event) => {
      if (event.altKey && event.key === 'TAB') {
        event.preventDefault();
      }
    });
  }
  disableEscapeKey() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
      }
    });
  }

  checkScreenSize() {
    const isMobile = window.innerWidth <= 767;
    if (!isMobile) {
      this.addMarginToClass();
    } else {
      this.removeMarginToClass();
    }
  }

  addMarginToClass() {
    const element = this.el.nativeElement.querySelector('.marginthisbox');
    this.renderer.setStyle(element, 'margin', '200px');
  }
  removeMarginToClass() {
    const element = this.el.nativeElement.querySelector('.marginthisbox');
    this.renderer.setStyle(element, 'margin', '0px');
  }


  // gemini

  analysisResult: string = '';

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  } 



  trimResponse(responseText: string): string {
    const startIndex = responseText.indexOf('* **Identifying the main argument and thesis statement**');
    return startIndex !== -1 ? responseText.substring(0, startIndex).trim() : responseText;
  }

  async showTypingEffect(text: string) {
    this.analysisResult = '';
    
    const lines = text.split('\n');
    for (let line of lines) {
      if (line.startsWith('##')) {
        this.analysisResult += `<p class="text-2xl text-center text-green-500 font-bold mb-4">${line.replace('##', '').trim()}</p>`;
      } else if (line.startsWith('* **')) {
        this.analysisResult += `<p class="text-lg font-normal mb-1">${line.replace(/\*\*/g, '').trim()}</p>`;
      } else if (line.startsWith('**')) {
        this.analysisResult += `<p class="text-xl font-semibold mb-1">${line.replace(/\*\*/g, '').trim()}</p>`;
      } else {        
        this.analysisResult += `<p class="mt-4 text-md font-extralight ">${line}</p>`;
      }
      await this.delay(30); 
    }
    
    this.snackBar.dismiss(); 
  }

}
