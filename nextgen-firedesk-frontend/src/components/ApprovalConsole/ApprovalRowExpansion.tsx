import React, { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { approvalConsoleApi } from '@/services/api/approvalConsoleApi';
import type { SubmissionDetails, SubmissionDeviation } from '@/services/api/approvalConsoleApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Check,
  X,
  AlertTriangle,
  Camera,
  MessageSquare,
  History,
  ZoomIn,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';

/* ════════════════════════════════════════════════════════
 *  Photo Lightbox
 * ════════════════════════════════════════════════════════ */
interface LightboxPhoto {
  url: string;
  caption?: string;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({ photos, initialIndex, onClose }) => {
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];

  const prev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : photos.length - 1)), [photos.length]);
  const next = useCallback(() => setIndex((i) => (i < photos.length - 1 ? i + 1 : 0)), [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      {photos.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 rounded-full px-3 py-1">
          {index + 1} / {photos.length}
        </div>
      )}

      {/* Prev / Next */}
      {photos.length > 1 && (
        <>
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
            onClick={(e) => { e.stopPropagation(); prev(); }}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
            onClick={(e) => { e.stopPropagation(); next(); }}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo.url}
          alt={photo.caption || `Photo ${index + 1}`}
          className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
        />
        <div className="flex items-center gap-3">
          {photo.caption && (
            <span className="text-white/80 text-sm max-w-md truncate">{photo.caption}</span>
          )}
          <a
            href={photo.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white p-1.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
            title="Download"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

interface ApprovalRowExpansionProps {
  submissionId: string;
  onApprove: () => void;
  onReject: () => void;
}

const DeviationCard: React.FC<{
  deviation: SubmissionDeviation;
  index: number;
  onPhotoClick?: (url: string) => void;
}> = ({
  deviation,
  index,
  onPhotoClick,
}) => {
  const severityColor = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-amber-100 text-amber-800 border-amber-300',
    low: 'bg-green-100 text-green-800 border-green-300',
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-muted">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{deviation.question_text}</span>
          {deviation.severity_level && (
            <Badge
              variant="outline"
              className={`text-[10px] ${
                severityColor[deviation.severity_level as keyof typeof severityColor] ||
                severityColor.medium
              }`}
            >
              {deviation.severity_level.toUpperCase()}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
            {deviation.compliance_status}
          </Badge>
        </div>
        {deviation.answer_value && (
          <p className="text-xs text-muted-foreground">
            Answer: <span className="text-foreground">{deviation.answer_value}</span>
          </p>
        )}
        {deviation.notes && (
          <div className="flex items-start gap-1 mt-1">
            <MessageSquare className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground italic">{deviation.notes}</p>
          </div>
        )}
        {deviation.photo_urls && deviation.photo_urls.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <Camera className="h-3 w-3 text-muted-foreground" />
            <div className="flex gap-1.5">
              {deviation.photo_urls.slice(0, 4).map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPhotoClick?.(url)}
                  className="relative group cursor-pointer"
                >
                  <img
                    src={url}
                    alt={`Evidence ${i + 1}`}
                    className="h-12 w-12 rounded-md object-cover border hover:ring-2 ring-primary transition-all"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-md transition-colors flex items-center justify-center">
                    <ZoomIn className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
              {deviation.photo_urls.length > 4 && (
                <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                  +{deviation.photo_urls.length - 4}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {deviation.priority_score != null && (
        <div className="flex-shrink-0 text-right">
          <span className="text-xs text-muted-foreground">Score</span>
          <p className="text-sm font-bold font-mono">{deviation.priority_score.toFixed(0)}</p>
        </div>
      )}
    </div>
  );
};

const ApprovalRowExpansion: React.FC<ApprovalRowExpansionProps> = ({
  submissionId,
  onApprove,
  onReject,
}) => {
  const [lightbox, setLightbox] = useState<{ photos: LightboxPhoto[]; index: number } | null>(null);

  const { data: details, isLoading } = useQuery<SubmissionDetails>({
    queryKey: ['approval-details', submissionId],
    queryFn: () => approvalConsoleApi.getSubmissionDetails(submissionId),
    staleTime: 60_000,
  });

  /** Collect all photos from deviations + details.photos into one flat gallery */
  const allPhotos: LightboxPhoto[] = React.useMemo(() => {
    if (!details) return [];
    const photos: LightboxPhoto[] = [];
    // From deviations
    details.deviations?.forEach((d) => {
      d.photo_urls?.forEach((url) => {
        photos.push({ url, caption: d.question_text });
      });
    });
    // From details.photos (deduplicate by url)
    const existing = new Set(photos.map((p) => p.url));
    details.photos?.forEach((p) => {
      if (!existing.has(p.url)) {
        photos.push({ url: p.url, caption: p.question_text });
        existing.add(p.url);
      }
    });
    return photos;
  }, [details]);

  const openLightbox = useCallback(
    (url: string) => {
      const idx = allPhotos.findIndex((p) => p.url === url);
      setLightbox({ photos: allPhotos, index: idx >= 0 ? idx : 0 });
    },
    [allPhotos],
  );

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground animate-in fade-in duration-200">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading details...</span>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Could not load submission details.
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/10 border-t animate-in slide-in-from-top-2 duration-200 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {/* Deviations */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold">
              Deviations ({details.deviations?.length || 0})
            </h4>
          </div>

          {details.deviations && details.deviations.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {details.deviations.map((d, i) => (
                <DeviationCard key={d.id || i} deviation={d} index={i} onPhotoClick={openLightbox} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">
              No deviations found — all checks passed.
            </p>
          )}

          {/* Remarks */}
          {details.remarks && details.remarks.length > 0 && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <h4 className="text-sm font-semibold">Technician Remarks</h4>
              </div>
              <div className="space-y-1">
                {details.remarks.map((r, i) => (
                  <div
                    key={i}
                    className="text-xs bg-blue-50 text-blue-800 border border-blue-200 rounded-md p-2"
                  >
                    <span className="font-medium">{r.question_text}:</span> {r.notes}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: Failure History + Actions */}
        <div className="space-y-4">
          {/* Photo Evidence Summary */}
          {details.photos && details.photos.length > 0 && (
            <Card className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-blue-500" />
                <h4 className="text-sm font-semibold">
                  All Photos ({details.photos.length})
                </h4>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {details.photos.slice(0, 6).map((photo, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => openLightbox(photo.url)}
                    className="aspect-square rounded-md overflow-hidden border hover:ring-2 ring-primary transition-all cursor-pointer relative group"
                  >
                    <img
                      src={photo.url}
                      alt={photo.question_text || `Photo ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
              {details.photos.length > 6 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  +{details.photos.length - 6} more photos
                </p>
              )}
            </Card>
          )}

          {/* Failure History */}
          {details.failure_history && details.failure_history.length > 0 && (
            <Card className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-orange-500" />
                <h4 className="text-sm font-semibold">Failure History</h4>
              </div>
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                {details.failure_history.map((entry, i) => (
                  <div
                    key={i}
                    className="text-xs flex items-center justify-between py-1 border-b last:border-0"
                  >
                    <span className="text-muted-foreground">
                      {entry.submitted_at
                        ? new Date(entry.submitted_at).toLocaleDateString()
                        : '—'}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        entry.status === 'rejected'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {entry.status}
                    </Badge>
                    <span className="font-mono text-xs">
                      {entry.calculated_priority_score?.toFixed(0) || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={onApprove}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={onReject}
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      </div>

      {/* Photo Lightbox */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
};

export default ApprovalRowExpansion;
