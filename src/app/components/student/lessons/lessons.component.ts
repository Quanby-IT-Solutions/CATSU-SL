

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { APIService } from 'src/app/services/API/api.service';
import { Location } from '@angular/common';

interface Lesson {
  id: string;
  title: string;
  firstname: string;
  lastname: string;
  time: string;
  details: string;
  progress: number;
  topics?: Topic[];
}

interface Topic {
  id: string;
  topicid: string;
  title: string;
  details: string;
  attachments: { file: string; type: string; timestamp?: number }[]; // Updated to include type and timestamp
}

@Component({
  selector: 'app-lessons',
  templateUrl: './lessons.component.html',
  styleUrls: ['./lessons.component.css']
})
export class LessonsComponent implements OnInit {
  lessons: Lesson[] = [];
  hideMarkAsDone: boolean = false;

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
    this.API.getLessons().subscribe(data => {
      this.lessons = data.output;
      console.log(this.lessons);
      this.API.hideLoader();

      // Fetch topics and attachments for each lesson
      this.lessons.forEach((lesson: Lesson) => {
        this.API.getTopics(lesson.id).subscribe((topicsData: any) => {
          lesson.topics = topicsData.output;
          console.log(`Topics for Lesson ${lesson.id}:`, lesson.topics);

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
                    console.log(`Attachments for Topic ${topic.topicid}:`, topic.attachments); // Display attachments
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
    });
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
      // Make sure to pass the `quizID` from the `file` object
      const quizID = file.quizID || '';  // Assuming quizID is part of the attachment data
      
      // Call the method to open interactive content with the quizID
      this.API.openFileInteractive(file.file, file.type, file.timestamp, file.quiz_id); // Pass the quizID
    } else {
      this.API.openFile(file.file);
    }

  }
  
  

  getFilenameFromPath(filePath: string): string {
    return filePath.split('>').length > 1 ? filePath.split('>')[1] : filePath;
  }
}
