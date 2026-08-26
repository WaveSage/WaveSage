import type { ReportNote, ReportReasonCode } from "./config";
import type {
  ConditionTag,
  CrowdLevel,
  SurfaceCondition,
  WaveQuality,
  WaveSize,
} from "./structured";

export type GpsSource = "device" | "exif";

export interface UserReportRecord {
  id: string;
  userId: string;
  username: string;
  spotId: string;
  spotName: string;
  normalizedCaption: string;
  waveQuality?: WaveQuality;
  waveSize?: WaveSize;
  surface?: SurfaceCondition;
  crowd?: CrowdLevel;
  tags?: ConditionTag[];
  imageFileName: string;
  thumbnailFileName: string;
  imageContentConfidence: number;
  distanceToSpotMiles: number;
  captureTimeUtc: string;
  submissionTimeUtc: string;
  imageMetadata: {
    gpsUsed: GpsSource;
    latitude: number;
    longitude: number;
    captureTimeUtc: string;
  };
  notes: ReportNote[];
  deleted: boolean;
  moderationHidden: boolean;
}

export interface UserReportGalleryItem {
  id: string;
  spotId: string;
  spotName: string;
  normalizedCaption: string;
  waveQuality?: WaveQuality;
  waveSize?: WaveSize;
  surface?: SurfaceCondition;
  crowd?: CrowdLevel;
  tags?: ConditionTag[];
  captureTimeUtc: string;
  submissionTimeUtc: string;
  distanceToSpotMiles: number;
  imageContentConfidence: number;
  notes: ReportNote[];
  username: string;
  isOwn: boolean;
  imageUrl: string;
  thumbnailUrl: string;
}

export interface ReportAcceptResponse {
  status: "accepted";
  report_id: string;
  spot_id: string;
  normalized_caption: string;
  image_metadata: {
    gps_used: GpsSource;
    latitude: number;
    longitude: number;
    capture_time_utc: string;
  };
  distance_to_spot_miles: number;
  image_content_confidence: number;
  notes: ReportNote[];
  gallery_url: string;
}

export interface ReportRejectResponse {
  status: "rejected";
  reason_code: ReportReasonCode;
  user_message: string;
  fields: string[];
}

export type ReportSubmitResponse = ReportAcceptResponse | ReportRejectResponse;

export interface SubmissionInput {
  imageBuffer: Buffer;
  mimeType: string;
  caption: string;
  waveQuality?: WaveQuality;
  waveSize?: WaveSize;
  surface?: SurfaceCondition;
  crowd?: CrowdLevel;
  tags?: ConditionTag[];
  spotId: string;
  userId: string;
  username: string;
  submissionTimestampUtc: string;
  deviceLat?: number;
  deviceLon?: number;
  deviceTs?: string;
  exifLat?: number;
  exifLon?: number;
  exifCaptureTime?: string;
}
