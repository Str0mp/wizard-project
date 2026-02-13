import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-contratar-page',
  templateUrl: './contratar-page.component.html',
})
export class ContratarPageComponent implements OnInit {
  productoId: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.productoId = params.get('productoId');
    });
  }
}
