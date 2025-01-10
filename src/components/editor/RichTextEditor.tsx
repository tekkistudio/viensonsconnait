// src/components/editor/RichTextEditor.tsx
'use client'

import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Link as LinkIcon,
  Image as ImageIcon 
} from 'lucide-react'
import MediaManager from '../../components/media/MediaManager'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
}

const Toolbar = ({ editor }: { editor: any }) => {
  const [showMediaManager, setShowMediaManager] = useState(false);

  if (!editor) {
    return null
  }

  const addLink = () => {
    const url = window.prompt('URL du lien:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const handleImageSelect = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run();
    setShowMediaManager(false);
  };

  return (
    <>
      <div className="border-b border-gray-200 p-2 flex flex-wrap gap-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-gray-100' : ''}`}
          title="Gras"
        >
          <Bold className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-gray-100' : ''}`}
          title="Italique"
        >
          <Italic className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-gray-100' : ''}`}
          title="Liste à puces"
        >
          <List className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-gray-100' : ''}`}
          title="Liste numérotée"
        >
          <ListOrdered className="w-5 h-5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('blockquote') ? 'bg-gray-100' : ''}`}
          title="Citation"
        >
          <Quote className="w-5 h-5" />
        </button>
        <button
          onClick={addLink}
          className={`p-2 rounded hover:bg-gray-100 ${editor.isActive('link') ? 'bg-gray-100' : ''}`}
          title="Ajouter un lien"
        >
          <LinkIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowMediaManager(true)}
          className="p-2 rounded hover:bg-gray-100"
          title="Ajouter une image"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
      </div>

      {showMediaManager && (
        <MediaManager
          onSelect={handleImageSelect}
          onClose={() => setShowMediaManager(false)}
        />
      )}
    </>
  )
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-brand-blue hover:text-brand-pink',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent 
        editor={editor} 
        className="prose max-w-none p-4 min-h-[400px] focus:outline-none"
      />
    </div>
  )
}