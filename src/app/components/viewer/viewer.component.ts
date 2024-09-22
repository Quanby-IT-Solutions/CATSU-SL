import { AfterContentInit, Component, Input, ViewChild, ElementRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PopupQuizPageComponent } from '../student/popup-quiz-page/popup-quiz-page.component';

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

  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;

  countdown: number = 3; 
  showCountdown: boolean = false; 
  addSec: boolean = false;
  quizShown: boolean = false;

  constructor(private modalService: NgbModal) {}

  ngAfterContentInit(): void {
    if (this.interactive) {
      this.setupInteractiveVideo();
    }
  }

  setupInteractiveVideo(): void {
    const videoPlayer = this.videoPlayerRef.nativeElement;
    videoPlayer.addEventListener('timeupdate', () => {
      this.checkTimestamp(videoPlayer);  
    });
  }

  // checkTimestamp(videoPlayer: HTMLVideoElement): void {
  //   if (this.interactive && videoPlayer.currentTime >= this.timestamp && !this.quizShown) {
  //     videoPlayer.pause();
  //     this.startCountdown(videoPlayer); 
  //     this.quizShown = true;
  //   }
  // }

  checkTimestamp(videoPlayer: HTMLVideoElement): void {
    if (this.interactive && !this.quizShown) {
      if (videoPlayer.currentTime === this.timestamp) {
        videoPlayer.pause();
        this.startCountdown(videoPlayer);
        this.quizShown = true;
      } else if (videoPlayer.currentTime > this.timestamp) {
        videoPlayer.pause();
        this.startCountdown(videoPlayer);
        this.quizShown = true;
      }
    }
  }
  

  startCountdown(videoPlayer: HTMLVideoElement): void {
    this.showCountdown = true;  
    
    const interval = setInterval(() => {
      this.countdown -= 1;
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

    this.timestamp = Number(this.timestamp) + 1; 
    videoPlayer.currentTime = this.timestamp;
    videoPlayer.play();
    this.addSec = false; 
  }

  showQuizModal(quizID: string, videoPlayer: HTMLVideoElement): void {
    const modalRef = this.modalService.open(PopupQuizPageComponent, { size: 'lg', backdrop: 'static' }); 
    modalRef.componentInstance.quizID = quizID;

    modalRef.result.then(() => {
      this.addSec = true; 
      this.resumeVideoAtTime(videoPlayer); 
    }).catch((error) => {
      console.error('Modal dismissed with error:', error);
    });
  }
}
