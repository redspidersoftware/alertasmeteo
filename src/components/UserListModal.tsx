import { useState, useEffect } from 'react';
import { getUsers, type UserData } from '../services/userService';
import { X, Users, Database, CheckCircle, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const UserListModal = ({ isOpen, onClose }: Props) => {
    const [users, setUsers] = useState<UserData[]>([]);

    useEffect(() => {
        if (isOpen) {
            getUsers().then(setUsers);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden relative max-h-[80vh] flex flex-col"
                >
                    <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                                <Database size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Base de Datos de Usuarios</h2>
                                <p className="text-sm text-slate-400">Registros locales almacenados</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        {users.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Users size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No hay usuarios registrados.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-white/5 uppercase font-medium text-xs text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3 rounded-tl-lg">Nombre</th>
                                            <th className="px-4 py-3">Email</th>
                                            <th className="px-4 py-3">Teléfono</th>
                                            <th className="px-4 py-3">CP</th>
                                            <th className="px-4 py-3">Idioma</th>
                                            <th className="px-4 py-3 rounded-tr-lg text-center">Verificado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {users.map((user, index) => (
                                            <tr key={index} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                                                <td className="px-4 py-3">{user.email}</td>
                                                <td className="px-4 py-3 font-mono">{user.phone}</td>
                                                <td className="px-4 py-3 font-mono text-center">{user.postalCode}</td>
                                                <td className="px-4 py-3 text-center uppercase">{user.language || 'ES'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {user.isVerified ? (
                                                        <span className="inline-flex items-center gap-1 text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-xs">
                                                            <CheckCircle size={12} /> SI
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-xs">
                                                            <XCircle size={12} /> NO
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="mt-6 text-xs text-slate-500 bg-black/20 p-3 rounded border border-white/5">
                            <p>⚠️ Nota: Para verificar un usuario manualmente, usa la URL: <code>?verify=EMAIL</code></p>
                            <p>Ejemplo: <code>http://localhost:5173/?verify=usuario@email.com</code></p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
