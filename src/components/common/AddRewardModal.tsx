import React, { useState, useRef } from 'react';
import { useTimeTracker } from '@/context/TimeTrackerContext';
import { CoinIcon, TrashIcon, PlusIcon } from '@/components/Icons';

export const AddRewardModal = ({ onClose }: { onClose: () => void }) => {
    const { addReward } = useTimeTracker();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [cost, setCost] = useState(10);
    const [productLink, setProductLink] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageInputUrl, setImageInputUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || cost <= 0) return;
        
        let finalImage = imageUrl;
        if (!finalImage && imageInputUrl.trim()) {
            finalImage = imageInputUrl.trim();
        }

        addReward({ 
            title, 
            description, 
            cost, 
            imageUrl: finalImage,
            link: productLink.trim()
        });
        onClose();
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 400; 
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    setImageUrl(dataUrl);
                    setImageInputUrl('');
                };
                img.src = readerEvent.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl w-full max-w-sm border border-gray-700 shadow-2xl p-6">
                <h3 className="text-xl font-bold mb-4">Nueva Recompensa</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Título</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" required placeholder="Ej: Cena Sushi, Móvil, Zapatillas..." />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Descripción (Opcional)</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={2} />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Enlace del Premio (Opcional)</label>
                        <input type="url" value={productLink} onChange={e => setProductLink(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs" placeholder="https://amazon.es/..." />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Coste (HC)</label>
                        <div className="flex items-center gap-2">
                            <div className="text-yellow-500"><CoinIcon /></div>
                            <input type="number" value={cost} onChange={e => setCost(Number(e.target.value))} className="flex-grow bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" min={1} required />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs text-gray-400 mb-2">Imagen</label>
                        {imageUrl ? (
                            <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-600 group mb-3">
                                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white hover:bg-red-500 transition-colors">
                                    <TrashIcon />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10 text-xs">
                                    <PlusIcon />
                                    <span>📁 Subir foto de galería</span>
                                </button>
                                <div className="flex items-center gap-2">
                                    <div className="h-px bg-gray-700 flex-grow"></div>
                                    <span className="text-xs text-gray-500">O</span>
                                    <div className="h-px bg-gray-700 flex-grow"></div>
                                </div>
                                <input type="url" placeholder="🔗 Pegar URL de imagen..." value={imageInputUrl} onChange={(e) => setImageInputUrl(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs" />
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 bg-gray-700 text-white py-2 rounded-lg font-bold hover:bg-gray-600 transition-colors">Cancelar</button>
                        <button type="submit" className="flex-1 bg-primary text-bkg py-2 rounded-lg font-bold hover:opacity-90 transition-opacity">Crear</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
