// assignment.component.ts

import { Component, OnDestroy, OnInit, Renderer2, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { APIService } from 'src/app/services/API/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-assignment',
  templateUrl: './assignment.component.html',
  styleUrls: ['./assignment.component.css']
})
export class AssignmentComponent implements OnInit, OnDestroy {
  timerActive: boolean = true;
  tasks: any[] = [];
  quizPoints: Map<string, any> = new Map();
  showDescription: boolean = true;
  windowWidth: number = window.innerWidth;

  getAssignment$?: Subscription;
  getQuizzes$?: Subscription;
  getQuizPoints$?: Subscription;

  // Property for filtering tasks
  filterType: string = 'all';

  constructor(private router: Router, private API: APIService, private renderer: Renderer2) {}

  ngOnInit(): void {
    this.API.showLoader();
    this.getAssignment$ = this.API.studentGetAssignments().subscribe(data => {
      const tasks: any = [];
      for (let task of data.output) {
        task.type = 'assignment';
        task.done = Number(task.done);
        // Ensure the deadline is in the correct format (date string)
        task.deadline = new Date(task.deadline); // Converts to Date object for consistency
        tasks.push(task);
      }
      this.getQuizzes$ = this.API.studentGetQuizzes().subscribe(data => {
        for (let task of data.output) {
          task.type = 'quiz';
          task.done = Number(task.done);
          task.deadline = new Date(task.deadline);
          tasks.push(task);
        }
        this.getQuizPoints$ = this.API.studentQuizPoints().subscribe(data => {
          for (let quiz of data.output) {
            this.quizPoints.set(quiz.assessmentid, quiz);
          }
        });
        this.API.hideLoader();
        // Sort tasks by their due date or time created
        tasks.sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        this.tasks = tasks;
      });
    });
  }

  parseDate(date: Date | string): string {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  ngOnDestroy(): void {
    this.getAssignment$?.unsubscribe();
    this.getQuizzes$?.unsubscribe();
    this.getQuizPoints$?.unsubscribe();
    this.checkScreenWidth();
  }

  
  switchTag(type: string) {
    switch (type) {
      case 'assignment':
        return 'Assignment';
      case 'quiz':
        return 'Quiz';
      default:
        return 'Assignment';
    }
  }

  redirect(taskID: string) {
    this.router.navigate(['student/materials', { taskID: taskID }]);
  }

attemptQuiz(task: any) {
    if (task.done) {
      this.API.successSnackbar("This quiz is submitted!");
      return;
    }
    if (this.checkOverdue(task.deadline)) {
      this.API.failedSnackbar('This quiz is overdue and cannot be taken anymore.');
      return;
    }

    Swal.fire({
      title: 'Ready?',
      text: 'Keep in mind that exiting fullscreen mode while answering will terminate your quiz!',
      icon: 'warning',
      confirmButtonColor: '#0172AF',
    }).then((value) => {
      if (value.isConfirmed) {
        this.API.quizID = task.id;
        this.router.navigate(['student/quiz-page']);
      }
    });
  }

  getQuizPoint(quizID: string) {
    if (!this.quizPoints.has(quizID)) return null;
    const quiz = this.quizPoints.get(quizID);
    return quiz.takenpoints + '/' + quiz.totalpoints;
  }

  checkOverdue(date: string) {
    const dateObject = new Date(date);
    return ((dateObject.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) + 1 < 0;
  }

  // Added truncateDescription function
  truncateDescription(description: string, limit: number): string {
    const words = description.split(' ');
    if (this.windowWidth < 1000 && words.length > 7) {
      return words.slice(0, 7).join(' ') + '...';
    }
    if (words.length > limit) {
      return words.slice(0, limit).join(' ') + '...';
    }
    return description;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.windowWidth = event.target.innerWidth;
    this.checkScreenWidth();
  }

  checkScreenWidth(): void {
    this.showDescription = this.windowWidth >= 500;
  }

  // Method for filtering tasks based on filterType
  filteredTasks() {
    if (this.filterType === 'all') {
      return this.tasks;
    }
    return this.tasks.filter(task => task.type === this.filterType);
  }

  setFilterType(type: string) {
    this.filterType = type;
  }
}