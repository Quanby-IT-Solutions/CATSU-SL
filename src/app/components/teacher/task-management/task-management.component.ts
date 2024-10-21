import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TaskcreationComponent } from '../teacher-modals/taskcreation/taskcreation.component';
import { CreateFeedbackComponent } from '../teacher-modals/create-feedback/create-feedback.component';
import { APIService } from 'src/app/services/API/api.service';
import { Router } from '@angular/router';
import { TeacherViewComponent } from '../teacher-view/teacher-view.component';

@Component({
  selector: 'app-task-management',
  templateUrl: './task-management.component.html',
  styleUrls: ['./task-management.component.css'],
})
export class TaskManagementComponent implements OnInit {
  currentDate!: string;
  courses: Map<string, any> = new Map();
  tasks: any[] = [];
  filterCourse: string = '';
  submissions: any[] = [];
  classes: { id: string, name: string }[] = []; // Define the classes property

  constructor(
    private modalService: NgbModal,
    private API: APIService,
    private router: Router
  ) {}

  ngOnInit() {
    this.API.showLoader();
    const currentDate = new Date();
    this.currentDate = currentDate.toISOString().split('T')[0];

    // Load Courses
    this.API.teacherAllCourses().subscribe((data) => {
      for (let course of data.output) {
        this.courses.set(course.id, course);
      }
      this.API.hideLoader();
    });

    // Load Classes
    this.getTeacherClasses();

    // Load Submissions
    this.API.teacherGetAllSubmissions().subscribe((data) => {
      this.submissions = data.output;
    });

    // Load Tasks
    this.loadTasks();
  }

  getTeacherClasses() {
    if (this.filterCourse) {
      this.API.teacherGetClassesByCourse(this.filterCourse).subscribe(
        (data: any) => {
          if (data.success) {
            this.classes = data.output.map((_class: any) => ({
              id: _class.id,
              name: _class.class,
            }));
          } else {
            this.API.failedSnackbar('Failed loading classes');
          }
        },
        (error) => {
          console.error('Error loading classes:', error);
          this.API.failedSnackbar('Error loading classes');
        }
      );
    } else {
      this.classes = [];
    }
  }

  loadTasks() {
    this.API.teacherGetTasks().subscribe((data) => {
      console.log('Tasks data from API:', data.output); // Log the raw data from the API
  
      this.tasks = data.output.map((task: any) => {
        const classData = this.classes.find((c: { id: string }) => c.id === task.classid);
        console.log('Mapping class name for task:', task, 'Found class:', classData);
  
        return {
          ...task,
        };
      });
  
      console.log('Mapped tasks:', this.tasks); // Log the final mapped tasks
    });
  }
  

  selectCourse(courseid: string) {
    this.filterCourse = courseid;
    this.getTeacherClasses(); // Load classes when a course is selected
  }

  openFile(file: string) {
    this.API.openFile(file);
  }

  taskCreation() {
    const modalRef = this.modalService.open(TaskcreationComponent);
    modalRef.componentInstance.courses = Array.from(this.courses.values());
    modalRef.closed.subscribe((data) => {
      if (data != undefined) {
        this.loadTasks();
      }
    });
  }

  editTask(task: any) {
    const modalRef = this.modalService.open(TaskcreationComponent);
    modalRef.componentInstance.task = task;
    modalRef.componentInstance.courses = Array.from(this.courses.values());
    modalRef.closed.subscribe((data) => {
      if (data != undefined) {
        this.loadTasks();
      }
    });
  }

  deleteTask(task: any) {
    if (confirm(`Are you sure you want to delete the task titled "${task.title}"?`)) {
      this.API.teacherDeleteTask(task.id).subscribe(
        () => {
          this.tasks = this.tasks.filter((t: any) => t.id !== task.id);
          this.API.successSnackbar('Task deleted successfully.');
        },
        (error) => {
          this.API.failedSnackbar('Failed to delete the task.');
        }
      );
    }
  }

  createfeedback() {
    const modalRef = this.modalService.open(CreateFeedbackComponent);
  }

  navigateToTeacherView(submission: any): void {
    this.router.navigate(['teacher/teacher-view', {
      sid: submission.id,
      aid: submission.assignmentid,
      s: submission.firstname + " " + submission.lastname
    }]);
  }

  navigateBack(): void {
    this.router.navigate(['teacher/t-home']);
  }
}
