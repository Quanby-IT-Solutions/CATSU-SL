import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';
import { Location } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AnimationOptions } from 'ngx-lottie'; // Import for Lottie

interface Lesson {
  id: string;
  title: string;
  firstname: string;
  lastname: string;
  time: string;
  details: string;
  progress: number;
  topics?: Topic[];
  hasQuiz?: boolean; // for lesson quiz
}

interface Topic {
  id: string;
  topicid: string;
  title: string;
  details: string;
  attachments: { file: string; type: string; timestamp?: number; quiz_id?: string }[];
  hasQuiz?: boolean; 
  hasAttachmentQuiz?: boolean;
}

@Component({
  selector: 'app-lessons',
  templateUrl: './lessons.component.html',
  styleUrls: ['./lessons.component.css']
})
export class LessonsComponent implements OnInit {
  lessons: Lesson[] = [];
  hideMarkAsDone: boolean = false;

  // Define Lottie options
  lottieOptions: AnimationOptions = {
    // path: 'https://lottie.host/bd0cc3e3-bf04-4189-95d5-5f2141550864/OmuS6c5GpK.json', // Lottie animation URL
    path: 'https://lottie.host/e4f3816a-6637-4932-bf1a-c9b995936748/4ZuGelrs5m.json',
    autoplay: true,
    loop: true
  };

  constructor(
    private API: APIService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  navigateBack(): void {
    this.location.back();
  }

  markAsDone(lesson: Lesson) {
    lesson.progress = 100;
    const mark$ = this.API.lessonProgress(lesson.id, 100).subscribe(() => {
      mark$.unsubscribe();
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.hideMarkAsDone = params['hideMarkAsDone'] === 'true';
    });

    this.API.showLoader();

    // Fetch lessons and quizzes concurrently
    forkJoin({
      lessons: this.API.getLessons(),
      quizzes: this.API.teacherGetQuizzes()
    }).subscribe(
      ({ lessons, quizzes }) => {
        this.lessons = lessons.output;
        const lessonQuizMap = new Map();
        const topicQuizMap = new Map();

        quizzes.output.forEach((quiz: { topicid: any; lessonid: any; }) => {
          if (quiz.topicid) {
            topicQuizMap.set(quiz.topicid, quiz);
          } else if (quiz.lessonid) {
            lessonQuizMap.set(quiz.lessonid, quiz);
          }
        });

        // Loop through lessons and check for quizzes
        this.lessons.forEach((lesson: Lesson) => {
          lesson.hasQuiz = lessonQuizMap.has(lesson.id); // Lesson-level quiz

          // Fetch topics for each lesson
          this.API.getTopics(lesson.id).subscribe((topicsData: any) => {
            lesson.topics = topicsData.output.map((topic: Topic) => {
              topic.hasQuiz = topicQuizMap.has(topic.id); // Topic-level quiz
              return topic;
            });

            // Fetch attachments for each topic
            if (lesson.topics) {
              lesson.topics.forEach((topic: Topic) => {
                this.API.getTopicAttachments(topic.topicid).subscribe(
                  (attachmentsData) => {
                    if (attachmentsData.success) {
                      topic.attachments = attachmentsData.output.map((attachment: any) => ({
                        file: attachment.attachment,
                        type: attachment.type,
                        timestamp: attachment.timestamp || 0,
                        quiz_id: attachment.quiz_id
                      }));
                      // If any attachment is interactive (quiz), set hasQuiz for topic
                      topic.hasAttachmentQuiz = topic.hasAttachmentQuiz || topic.attachments.some(att => att.type === 'interactive');
                    } else {
                      console.error(`Error fetching attachments for topic ${topic.topicid}:`, attachmentsData.error || 'Unknown error');
                      this.API.failedSnackbar(`Failed to fetch attachments for topic ${topic.topicid}.`);
                    }
                  },
                  (error) => {
                    console.error(`Error fetching attachments for topic ${topic.topicid}:`, error);
                    this.API.failedSnackbar(`Failed to fetch attachments for topic ${topic.topicid}.`);
                  }
                );
              });
            }
          });
        });

        this.API.hideLoader();
      },
      error => {
        console.error('Error fetching lessons and quizzes:', error);
        this.API.hideLoader();
        this.API.failedSnackbar('Failed to load lessons and quizzes. Please try again.');
      }
    );
  }

  isDone(lesson: Lesson): boolean {
    return Number(lesson.progress) > 0;
  }

  getURL(file: string): string {
    return this.API.getURL(file);
  }

  parseTime(time: string): string {
    const t = time.split(/[- :]/) as unknown as number[];
    return new Date(Date.UTC(t[0], t[1] - 1, t[2], t[3], t[4], t[5])).toLocaleString();
  }

  handleFileClick(file: any, topic: any) {
    if (file.type === 'interactive') {
      this.API.openFileInteractive(file.file, file.type, file.timestamp, file.quiz_id);
    } else {
      this.API.openFile(file.file);
    }
  }

  getFilenameFromPath(filePath: string): string {
    return filePath.split('>').length > 1 ? filePath.split('>')[1] : filePath;
  }

  hasDash(details: string): boolean {
    // Check if any line starts with a dash (-)
    return details.split('\n').some(line => line.trim().startsWith('-'));
  }
}
