import cv2
import glob
import json
import os

import numpy as np

video = glob.glob(r"D:\Dev\TripWise\video_animation\*.mp4")[0]
output = r"C:\Users\PC\AppData\Local\Temp\tripwise-motion-t001"
os.makedirs(output, exist_ok=True)

capture = cv2.VideoCapture(video)
reported = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
fps = capture.get(cv2.CAP_PROP_FPS)
width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
frames = []
while True:
    ok, frame = capture.read()
    if not ok:
        break
    frames.append(frame)
capture.release()

print(json.dumps({
    "framesReported": reported,
    "framesDecoded": len(frames),
    "fps": fps,
    "width": width,
    "height": height,
    "durationSeconds": len(frames) / fps,
    "allFramesDecoded": len(frames) == reported,
}))

for sheet_index in range((len(frames) + 19) // 20):
    canvas = np.zeros((576, 1280, 3), dtype=np.uint8)
    for local_index, frame_index in enumerate(range(sheet_index * 20, min((sheet_index + 1) * 20, len(frames)))):
        image = cv2.resize(frames[frame_index], (256, 144))
        cv2.putText(image, f"F{frame_index:03d}", (6, 18), cv2.FONT_HERSHEY_SIMPLEX, .48, (255, 255, 255), 1, cv2.LINE_AA)
        row, column = divmod(local_index, 5)
        canvas[row * 144:(row + 1) * 144, column * 256:(column + 1) * 256] = image
    cv2.imwrite(os.path.join(output, f"contact_{sheet_index:02d}.png"), canvas)

for frame_index in range(120, 215, 2):
    cv2.imwrite(os.path.join(output, f"detailed_{frame_index:03d}.png"), frames[frame_index])
