import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AccountService } from '../services/account.service';
import { SongsService } from '../services/songs.service';
import { PlaylistsService } from '../services/playlists.service';
import { User } from '../models/user';
import { Song } from '../models/song';
import { SongVote } from '../models/song-vote';
import { SongComment } from '../models/song-comment';
import { Playlist } from '../models/playlist';
import { PlaylistSong } from '../models/playlist-song';
import { PlaylistModalComponent } from '../playlist-modal/playlist-modal.component';

@Component({
  selector: 'app-song-actions',
  templateUrl: './song-actions.component.html',
  styleUrls: ['./song-actions.component.css']
})
export class SongActionsComponent implements OnInit, OnChanges {

  @Input() song: Song;
  @Input() playlist: Playlist;
  @Input() showVotes: boolean = true;
  @Input() showComments: boolean = true;
  @Input() showPlaylists: boolean = true;
  @Input() showRemove: boolean = false;
  @Output() voteAdded = new EventEmitter<SongVote>();
  @Output() voteRemoved = new EventEmitter<SongVote>();
  @Output() commentAdded = new EventEmitter<SongComment>();
  @Output() commentRemoved = new EventEmitter<SongComment>();
  @Output() playlistAdded = new EventEmitter<PlaylistSong>();
  @Output() playlistRemoved = new EventEmitter<PlaylistSong>();
  @Output() songRemoved = new EventEmitter<Song>();

  user: User = null;
  playlists: Playlist[] = null;
  vote: SongVote;
  voteUpUsers: string;
  voteDownUsers: string;
  commentText: string;
  loading: boolean = false;

  constructor(
    private accountService: AccountService,
    private songsService: SongsService,
    private playlistsService: PlaylistsService,
    private modalService: NgbModal
  ) { }

  ngOnInit() {
    this.accountService.getUser().subscribe(user => {
      this.user = user;
      this.updateSong();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if ('song' in changes) {
      this.updateSong(changes['song'].currentValue);
    }
  }

  updateSong(song?: Song) {
    if (song !== undefined) {
      this.song = song;
    }
    if (this.user && this.song && this.song.votes) {
      this.vote = this.song.votes.find(vote => vote.user.id == this.user.id);
      this.voteUpUsers = this.song.votes.filter(vote => vote.score > 0).map(vote => vote.user.displayName).join(', ');
      this.voteDownUsers = this.song.votes.filter(vote => vote.score < 0).map(vote => vote.user.displayName).join(', ');
    } else {
      this.vote = undefined;
      this.voteUpUsers = undefined;
      this.voteDownUsers = undefined;
    }
    this.loading = false;
  }

  trackByCommentId(index: number, comment: SongComment): number {
    return comment.id;
  }

  trackByPlaylistId(index: number, playlist: Playlist): number {
    return playlist.id;
  }

  voteUp() {
    let score = (this.vote && this.vote.score) == 1 ? 0 : 1;
    this.loading = true;
    this.songsService.voteSong(this.song.catalogId, score).subscribe(song => {
      let previousVote = this.vote;
      this.updateSong(song);
      if (score != 0) {
        this.voteAdded.emit(this.vote);
      } else {
        this.voteRemoved.emit(previousVote);
      }
    });
  }

  voteDown() {
    let score = (this.vote && this.vote.score) == -1 ? 0 : -1;
    this.loading = true;
    this.songsService.voteSong(this.song.catalogId, score).subscribe(song => {
      let previousVote = this.vote;
      this.updateSong(song);
      if (score != 0) {
        this.voteAdded.emit(this.vote);
      } else {
        this.voteRemoved.emit(previousVote);
      }
    });
  }

  addComment(comment: string, commentForm: NgForm) {
    this.loading = true;
    this.songsService.addCommentToSong(this.song.catalogId, comment).subscribe(song => {
      commentForm.reset();
      this.updateSong(song);
      this.commentAdded.emit(song.comments.find(comment => comment.user.id == this.user.id));
    });
  }

  removeComment(comment: SongComment) {
    this.loading = true;
    this.songsService.removeCommentFromSong(this.song.catalogId, comment.id).subscribe(song => {
      this.updateSong(song);
      this.commentRemoved.emit(comment);
    });
  }

  addToPlaylist(playlist: Playlist) {
    this.loading = true;
    this.songsService.addSongToPlaylist(this.song.catalogId, playlist.id).subscribe(song => {
      this.updateSong(song);
      playlist.isSelected = true;
      this.playlistAdded.emit(new PlaylistSong(playlist, song));
    });
  }

  removeFromPlaylist(playlist: Playlist) {
    this.loading = true;
    this.songsService.removeSongFromPlaylist(this.song.catalogId, playlist.id).subscribe(song => {
      this.updateSong(song);
      playlist.isSelected = false;
      this.playlistRemoved.emit(new PlaylistSong(playlist, song));
    });
  }

  togglePlaylist(playlist: Playlist) {
    if (playlist.isSelected) {
      this.removeFromPlaylist(playlist);
    } else {
      this.addToPlaylist(playlist);
    }
  }

  createPlaylist() {
    let modal = this.modalService.open(PlaylistModalComponent);
    modal.componentInstance.playlist = new Playlist();
    modal.result.then((result: Playlist) => {
      this.playlistsService.createPlaylist(result.name).subscribe(playlist => {
        this.playlists = null;
      });
    }, reason => {});
  }

  onPlaylistOpen() {
    if (this.playlists == null) {
      this.playlistsService.getPlaylists(0, 100, 'name').subscribe(playlists => {
        this.updatePlaylists(playlists);
      });
    } else {
      this.updatePlaylists();
    }
  }

  updatePlaylists(playlists?: Playlist[]) {
    if (playlists !== undefined) {
      this.playlists = playlists;
    }
    if (this.playlists) {
      this.playlists.forEach(playlist => {
        playlist.isSelected = (this.song && this.song.playlists && this.song.playlists.findIndex(playlistSong => playlistSong.playlist.id == playlist.id) >= 0);
      });
    }
  }

}
