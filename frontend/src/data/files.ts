import type { FileItem } from "@/components/FileGridView"

export const files: FileItem[] = [
  { name: "logs", type: "folder", lastModified: "16/9/2023 5:54 am", permission: "777", size: "167 KB" },
  { name: "testfolder", type: "folder", lastModified: "4/12/2023 5:54 am", permission: "777", size: "7 MB" },
  { name: "public_html", type: "folder", lastModified: "26/1/2023 7:20 pm", permission: "665", size: "76 KB" },
  { name: "testfile.txt", type: "file", lastModified: "26/1/2023 5:54 am", permission: "567", size: "167 KB" },
  { name: "localhost.sql", type: "file", lastModified: "26/1/2023 5:54 am", permission: "777", size: "8 KB" },
  { name: "index.html", type: "file", lastModified: "26/1/2023 1:32 pm", permission: "777", size: "180 KB" },
  { name: "about.php", type: "file", lastModified: "14/7/2018 2:01 pm", permission: "777", size: "167 KB" },
]

