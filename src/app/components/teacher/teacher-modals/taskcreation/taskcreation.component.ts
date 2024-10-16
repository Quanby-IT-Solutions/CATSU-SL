import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { APIService } from 'src/app/services/API/api.service';

@Component({
  selector: 'app-taskcreation',
  templateUrl: './taskcreation.component.html',
  styleUrls: ['./taskcreation.component.css']
})
export class TaskcreationComponent implements OnInit {
  @Input() task: any; // For editing an existing task
  @Input() courses: any = [];

  course: string = '';
  deadline: string = '';
  title: string = '';
  description: string = '';
  file: File | null = null;
  isEditMode: boolean = false;
  existingAttachment: string | undefined;

  constructor(
    private API: APIService,  // Kept private for service logic
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    if (this.task) {
      // Edit mode: pre-fill the form with the task details
      this.isEditMode = true;
      this.title = this.task.title;
      this.description = this.task.details;
      this.deadline = this.task.deadline;
      this.course = this.task.courseID;
      this.existingAttachment = this.task.attachments;
    }
  }

  onFileSelected(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files) {
      this.file = inputElement.files[0];
    }
  }

  openAttachment(url: string): void {
    this.API.openFile(url);
  }

  closeModal(close?: string) {
    this.activeModal.close(close);
  }

  async createOrUpdateTask() {
    let attachments = this.isEditMode ? this.existingAttachment : undefined;

    this.API.justSnackbar(this.isEditMode ? 'Updating task...' : 'Creating task...', 9999999);

    // Handle file upload if a new file is selected
    if (this.file) {
      const fileParts = this.file.name.split('.');
      const serverLocation = this.API.createID36() + '.' + fileParts[fileParts.length - 1];
      await this.API.uploadFileWithProgress(this.file, serverLocation);
      const fileLocation = 'files/' + serverLocation;
      const filename = this.file.name;
      attachments = fileLocation + '>' + filename;
    }

    // Validate required fields
    if (this.API.checkInputs([this.deadline, this.title, this.description, this.course])) {
      if (this.isEditMode) {
        this.updateTask(attachments);
      } else {
        this.createTask(attachments);
      }
    } else {
      this.API.failedSnackbar('Please fill out all the fields.');
    }
  }

  createTask(attachments?: string) {
    this.API.createTask(this.course, this.title, this.description, this.deadline, attachments).subscribe(() => {
      this.API.successSnackbar('Task created!');
      this.API.notifyStudentsInCourse(
        `${this.API.getFullName()} uploaded a new task.`,
        `${this.API.getFullName()} uploaded a new task titled, <b>'${this.title}'</b>. Kindly take a moment to check the specified task. The task is due on <b>${this.API.parseDate(this.deadline)}</b>.`,
        this.course
      );
      this.closeModal('update');
    });
  }

  updateTask(attachments?: string) {
    this.API.editTask(this.task.id, this.title, this.description, this.deadline, attachments).subscribe(() => {
      this.API.successSnackbar('Task updated successfully!');
      this.closeModal('update');
    });
  }
}
