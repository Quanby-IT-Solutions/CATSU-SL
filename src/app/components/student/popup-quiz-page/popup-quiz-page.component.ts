import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

interface QuizOption {
  id: number;
  text: string;
  attachment?: string;
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
  selector: 'app-popup-quiz-page',
  templateUrl: './popup-quiz-page.component.html',
  styleUrls: ['./popup-quiz-page.component.css'],
})
export class PopupQuizPageComponent implements OnInit, OnDestroy {
  @Input() quizID: string = '';  // Receives quizID from parent component
  questions: Array<QuizItem> = [];
  currentQuestionIndex = 0;
  correctAnswers = 0;
  timeRemaining = 180;
  showResult = false;
  backtracking = true;
  review = true;
  randomize = true;
  title: string = 'Welcome to the Popup Quiz!';
  description: string = 'Enhance your communication skills at Speechlab and master the art of delivering clear, confident speech for every audience.';
  generating = false;
  isButtonDisabled = false;
  mode = 'reading';
  lang = 'en'; // Example default language, adjust as needed
  timer: any;
  quizCompleted = false; // Flag to prevent re-taking the quiz

  constructor(
    private API: APIService,
    private snackBar: MatSnackBar,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit() {
    if (this.quizID) {  // Ensure quizID is provided
      this.checkIfQuizCompleted();
    } else {
      this.snackBar.open('Quiz ID is missing. Unable to load quiz.', 'Close', { duration: 3000 });
    }
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  checkIfQuizCompleted() {
    if (this.quizCompleted) {
      this.snackBar.open('Quiz has already been completed.', 'Close', { duration: 3000 });
      this.closeModal(); // Close the modal if the quiz is already completed
    } else {
      this.loadQuiz();
      this.startTimer();
    }
  }


  loadQuiz() {
    this.API.studentGetQuiz(this.quizID).subscribe(
      (data) => {
        if (data.success) {
          this.questions = this.prepareQuizItems(data.output);
          this.shuffleQuestions();
        } else {
          this.snackBar.open('Failed to load quiz data.', 'Close', { duration: 3000 });
        }
      },
      (error) => {
        console.error('Error loading quiz data:', error);
        this.snackBar.open('Error loading quiz data. Please try again.', 'Close', { duration: 3000 });
      }
    );
  }

  prepareQuizItems(data: any[]): QuizItem[] {
    return data.map((item) => {
      const itemOptions: Array<QuizOption> = [];
      let i = 0;
      const correctAnswers: any[] = [];

      if (item.type == '0') {
        for (let option of item.options.split('\\n\\n')) {
          if (option.trim() == '') continue;
          const [text, attachment] = option.split('::::');
          const newOption: QuizOption = {
            id: i,
            text: String.fromCharCode(65 + i) + '. ' + text,
            attachment: this.getUrl(attachment)
          };
          itemOptions.push(newOption);
          i += 1;
        }
        correctAnswers.push(...item.answer.split(' ').map(Number));
      } else if (item.type == '1') {
        itemOptions.push({ id: 0, text: 'TRUE' }, { id: 1, text: 'FALSE' });
        correctAnswers.push(item.answer === 'T' ? 0 : 1);
      } else {
        itemOptions.push({ id: 0, text: `${item.answer}` });
        correctAnswers.push(item.answer);
      }

      const selectedAnswers = Number(item.type) > 1 ? [''] : [];

      return {
        type: Number(item.type),
        question: item.question.split('::::')[0],
        attachments: (item.question.split('::::')[1] || '').split('\\n\\n').map((attachment: string) => this.getUrl(attachment)).filter(Boolean),
        choices: itemOptions,
        correctAnswers,
        selectedAnswers,
        analysisResult: '',
        analysisAnswer: undefined
      };
    });
  }

  selectAnswer(choiceId: number) {
    const question = this.questions[this.currentQuestionIndex];
    const selectedIndex = question.selectedAnswers.indexOf(choiceId);

    if (question.type <= 1) {
      question.selectedAnswers = [choiceId]; // For single-choice questions
    } else if (selectedIndex === -1) {
      question.selectedAnswers.push(choiceId); // Add choice if not selected
    } else {
      question.selectedAnswers.splice(selectedIndex, 1); // Remove choice if already selected
    }
  }

  trackByFn(index: any, item: any) {
    return index;
  }

  isAnswerCorrect(question: QuizItem, choiceId: number): boolean {
    return question.correctAnswers.includes(choiceId);
  }

  isAnswerIncorrect(question: QuizItem, choiceId: number): boolean {
    return !this.isAnswerCorrect(question, choiceId) && question.selectedAnswers.includes(choiceId);
  }

  isUserSelectedAnswer(question: QuizItem, choiceId: number): boolean {
    return question.selectedAnswers.includes(choiceId);
  }

  isQuestionUnanswered(question: QuizItem): boolean {
    return question.selectedAnswers.length === 0;
  }

  shuffleQuestions() {
    if (this.randomize) {
      this.questions.sort(() => Math.random() - 0.5);
    }
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.textToSpeech();
    } else {
      this.finishQuiz();  // Call to finish the quiz
    }
  }

  prevQuestion() {
    if (this.backtracking && this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  finishQuiz() {
    this.stopTimer(); // Stop the timer
    this.checkAnswers(); // Calculate the results
    this.showResult = true; // Show the result section
    this.isButtonDisabled = true; // Disable further navigation
    this.quizCompleted = true; // Mark the quiz as completed

    // Close the modal after a short delay to allow user to see the result
    setTimeout(() => {
      this.closeModal();
    }, 2000); // Adjust delay time if needed
  }

  closeModal() {
    this.activeModal.close(); // Close the modal
  }

  startTimer() {
    this.timer = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
      } else {
        this.finishQuiz();
      }
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timer);
  }

  secondsToMinutes(seconds: number): string {
    return seconds < 60 ? seconds.toString() : Math.floor(seconds / 60).toString() + ':' + (seconds % 60).toString().padStart(2, '0');
  }

  getUrl(link: string): string {
    return this.API.getURL(link);
  }

  textToSpeech() {
    if (this.generating || this.mode !== 'listening') return;
    this.generating = true;
    const talk$ = this.API.textToSpeech(this.questions[this.currentQuestionIndex].question, this.lang).subscribe((data) => {
      this.generating = false;
      const audio = new Audio(data.fileDownloadUrl);
      audio.play();
      talk$.unsubscribe();
    });
  }

  async checkAnswers() {
    this.API.showLoader();
    this.correctAnswers = 0;

    for (let question of this.questions) {
      const correctAnswersSet = new Set(question.correctAnswers);
      const selectedAnswersSet = new Set(question.selectedAnswers);

      if (question.type == 3) {
        const score = await this.geminiCheckAnswer(question);
        if (score == null) {
          this.correctAnswers = 0;
          this.checkAnswers();
          return;
        }
        this.correctAnswers += score!;
      } else {
        if (
          this.setsAreEqual(correctAnswersSet, selectedAnswersSet) ||
          this.matchText(question.selectedAnswers[0], question.correctAnswers[0])
        ) {
          this.correctAnswers++;
        }
      }
    }

    this.API.hideLoader();
  }

  matchText(target: any, src: any) {
    if (typeof target == 'string' && typeof src == 'string') {
      return target.toLowerCase() === src.toLowerCase();
    } else {
      return false;
    }
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

  getRealTotal(): number {
    return this.questions.reduce((acc: number, curr: QuizItem) => {
      return curr.type === 3 ? acc + 5 : acc + 1; // Adjust scoring as needed
    }, 0);
  }

  async geminiCheckAnswer(question: QuizItem): Promise<number | null> {
    const answer = question.selectedAnswers[0];

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
}
 