# Media Storage and Upload Guidelines

## Storage Backend
- **Provider:** Amazon S3.
- **Bucket structure:** `inspections/<inspection-id>/photos/<photo-id>.<ext>`.
  - Keeps all media for a given inspection co-located for easy listing and lifecycle management.
  - Use UUIDs for `<photo-id>` to avoid collisions.
- **Server-side encryption:** AES-256 (SSE-S3). Attach minimal IAM policies per environment.
- **Retention:** Apply lifecycle rules per environment (e.g., 90-day archive for staging, product policy for prod).

## CDN
- **Need:** Yes, fronted by CloudFront (or equivalent) with private origin access.
- **Cache keys:** Path + `inspection-id` prefixes; no query params required for photos.
- **Access control:** Use pre-signed S3 URLs for uploads and for authenticated access to originals. CDN can cache resized/optimized variants if introduced later.

## Upload Constraints
- **Max file size:** 15 MB per photo (covers high-res mobile photos while keeping bandwidth reasonable).
- **Allowed types:** `image/jpeg`, `image/png`, `image/heic`, `image/heif`, `image/webp`.
- **Per-inspection count:** Hard cap of **60 photos** per inspection.

## Validation and Errors
- Reject uploads that exceed size, violate type, or would exceed per-inspection count with a `400 Bad Request` and a JSON error payload:
  - `code`: machine-readable string (`invalid_type`, `too_large`, `too_many_photos`).
  - `message`: human-readable summary.
  - `limit`: include relevant limit (size in bytes or max count) when applicable.
- Apply both client-side and server-side validation; server-side is authoritative.
- Partial successes are not allowed for multi-upload requests: if any file fails validation, fail the batch without persisting any files.
- Store all accepted uploads with content-type metadata set to the validated MIME type.

## Operational Notes
- Image processing (thumbnails/optimizations) can be done asynchronously after upload; store variants alongside originals under the same `inspection-id` prefix.
- Consider Web Application Firewall rules to limit unknown MIME types and constrain request body size.
