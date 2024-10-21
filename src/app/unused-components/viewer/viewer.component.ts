import { AfterContentInit, Component, Input, ViewChild, ElementRef } from '@angular/core';
import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { QuizPageComponent } from 'src/app/components/student/quiz-page/quiz-page.component';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { APIService } from 'src/app/services/API/api.service';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.css']
})
export class ViewerComponent implements AfterContentInit {
  @Input() link: string = '';
  @Input() interactive: boolean = false;
  @Input() timestamp: number = 0;
  @Input() quizID: string = '';
  @Input() deadline: string = '';  // Deadline input as string

  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;

  countdown: number = 3;
  showCountdown: boolean = false;
  addSec: boolean = false;
  quizShown: boolean = false;

  constructor(
    private modalService: NgbModal,
    private activeModal: NgbActiveModal,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private apiService: APIService
  ) {}

  ngAfterContentInit(): void {
    if (this.interactive && this.isVideoFile()) {
      this.setupInteractiveVideo();
    }
  }

  setupInteractiveVideo(): void {
    const videoPlayer = this.videoPlayerRef.nativeElement;
    videoPlayer.addEventListener('timeupdate', () => {
      this.checkTimestamp(videoPlayer);
    });
  }

  checkTimestamp(videoPlayer: HTMLVideoElement): void {
    if (this.interactive && !this.quizShown) {
      if (videoPlayer.currentTime >= this.timestamp) {
        videoPlayer.pause();
        this.checkAndShowQuiz(videoPlayer);
        this.quizShown = true;
      }
    }
  }

  async checkAndShowQuiz(videoPlayer: HTMLVideoElement): Promise<void> {
    const currentDate = new Date();
    const quizDeadline = new Date(this.deadline);

    if (currentDate > quizDeadline) {
      this.apiService.failedSnackbar('You cannot take the exam, it is already due date.');
      return;
    }

    try {
      const studentID = this.apiService.getUserData()?.id; // Fetch student ID using the API service
      if (!studentID) {
        this.apiService.failedSnackbar('Unable to fetch student ID.');
        return;
      }

      console.log('Fetching quiz scores for student:', studentID, 'and quiz ID:', this.quizID);

      const quizScores = await this.apiService.getMyQuizScores(this.quizID);
      console.log('Fetched quiz scores:', quizScores);

      if (quizScores && quizScores.output.length > 0) {
        const scoreData = quizScores.output[0];
        console.log('Score data for student:', scoreData);
        
        if (scoreData.takenpoints !== null) {
          this.apiService.successSnackbar(
            `You have already completed this quiz. Score: ${scoreData.takenpoints}/${scoreData.totalpoints}`
          );
          return;
        }
      }

      this.startCountdown(videoPlayer);

    } catch (error) {
      console.error('Error fetching quiz scores:', error);
      this.apiService.failedSnackbar('Failed to fetch quiz scores. Please try again.');
    }
  }

  startCountdown(videoPlayer: HTMLVideoElement): void {
    console.log('Starting countdown...');
    this.showCountdown = true;

    const interval = setInterval(() => {
      this.countdown -= 1;
      console.log('Countdown:', this.countdown);
      if (this.countdown <= 0) {
        clearInterval(interval);
        this.showCountdown = false;
        this.showQuizModal(this.quizID, videoPlayer);
        this.countdown = 3;
      }
    }, 1000);
  }

  resumeVideoAtTime(videoPlayer: HTMLVideoElement): void {
    if (!this.addSec) return;

    console.log('Resuming video at timestamp:', this.timestamp + 1);
    this.timestamp = Number(this.timestamp) + 1;
    videoPlayer.currentTime = this.timestamp;
    videoPlayer.play();
    this.addSec = false;
  }

  showQuizModal(quizID: string, videoPlayer: HTMLVideoElement): void {
    console.log('Opening quiz modal with ID:', quizID);
    const modalRef = this.modalService.open(QuizPageComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      fullscreen: true
    });
    
    modalRef.componentInstance.quizID = quizID;
    this.apiService.quizID = quizID;

    modalRef.result.then(
      (result) => {
        console.log('Quiz completed with score:', result);
        this.addSec = true;
        this.resumeVideoAtTime(videoPlayer);
      },
      (reason) => {
        console.log('Modal dismissed with reason:', reason);
        this.addSec = true;
        this.resumeVideoAtTime(videoPlayer);
      }
    );
  }

  close() {
    this.activeModal.dismiss();
  }

  downloadFile() {
    console.log('Downloading file:', this.link);
    this.http.get(this.link, { responseType: 'blob' }).subscribe(blob => {
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = this.getFileName();
      a.click();
      URL.revokeObjectURL(objectUrl);
    });
  }

  getFileName(): string {
    return this.link.split('/').pop() || 'File';
  }

  isVideoFile(): boolean {
    return /\.(mp4|webm|ogg)$/i.test(this.link);
  }

  isPdfFile(): boolean {
    return /\.pdf$/i.test(this.link);
  }

  isImageFile(): boolean {
    return /\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(this.link);
  }

  isOtherSupportedFile(): boolean {
    return /\.(html|txt)$/i.test(this.link);
  }

  isUnsupportedFile(): boolean {
    return !this.isVideoFile() && !this.isPdfFile() && !this.isImageFile() && !this.isOtherSupportedFile();
  }
}
