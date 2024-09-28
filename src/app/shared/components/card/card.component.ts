import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css']
})
export class CardComponent implements OnInit {
  @Input() difficulty: number = 0;
  @Input() picture: string = '';
  @Input() number: string = '';
  @Input() lecture: string = '';
  @Input() profilepic: string = '';
  @Input() name: string = '';
  @Input() description: string = '';
  @Input() target_audience: string = '';
  @Input() objectives: string = '';
  @Input() job: string = '';
  @Input() enrolled: number = 0;

  targetAudience: string[] = [];

  // Fallback URLs
  defaultPicture: string = 'https://img.freepik.com/free-vector/online-tutorials-concept_52683-37480.jpg';
  defaultProfilePic: string = 'https://via.placeholder.com/100?text=No+Profile+Image';

  ngOnInit() {
    // Set target audience from input string
    this.targetAudience = this.target_audience.replace(/[{}]/g, '').split(',').map(item => item.trim());

    // Set default picture if none provided
    if (!this.picture || this.picture.trim().length === 0) {
      this.picture = this.defaultPicture;
    }

    // Set default profile picture if none provided
    if (!this.profilepic || this.profilepic.trim().length === 0) {
      this.profilepic = this.defaultProfilePic;
    }
  }
}
