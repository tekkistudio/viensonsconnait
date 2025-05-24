// src/app/admin/settings/whatsapp/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Download, SendHorizonal, Trash2, Search, 
  RefreshCw, Filter, MoreVertical 
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { whatsappAdminService as whatsappService } from '@/lib/services/whatsapp-admin.service';

interface Subscriber {
  id: string;
  phone_number: string;
  country_code: string;
  status: string;
  opt_in_date: string;
  last_interaction_date: string | null;
  tags: string[];
}

export default function WhatsAppPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    try {
      const data = await whatsappService.getAllSubscribers();
      setSubscribers(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des abonnés",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Numéro de téléphone',
      'Pays',
      'Statut',
      'Date d\'inscription',
      'Dernière interaction',
      'Tags'
    ];

    const csvContent = subscribers
      .map(sub => [
        sub.phone_number,
        sub.country_code,
        sub.status,
        sub.opt_in_date,
        sub.last_interaction_date || '',
        sub.tags.join(', ')
      ].join(','))
      .join('\n');

    const blob = new Blob([`${headers.join(',')}\n${csvContent}`], { 
      type: 'text/csv;charset=utf-8;' 
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `abonnes-whatsapp-${format(new Date(), 'dd-MM-yyyy')}.csv`;
    link.click();
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      await whatsappService.sendBulkMessage(selectedSubscribers, messageText);
      toast({
        title: "Succès",
        description: "Message envoyé avec succès",
      });
      setIsMessageDialogOpen(false);
      setMessageText('');
      setSelectedSubscribers([]);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
  };

  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = sub.phone_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || sub.status === selectedStatus;
    const matchesCountry = selectedCountry === 'all' || sub.country_code === selectedCountry;
    return matchesSearch && matchesStatus && matchesCountry;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Liste de diffusion WhatsApp</h1>
          <p className="text-muted-foreground">
            Gérez vos abonnés et envoyez des messages
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="Rechercher un numéro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Pays" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pays</SelectItem>
            <SelectItem value="SN">Sénégal</SelectItem>
            <SelectItem value="CI">Côte d'Ivoire</SelectItem>
            <SelectItem value="FR">France</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          onClick={() => setIsMessageDialogOpen(true)}
          className="flex items-center gap-2"
          disabled={selectedSubscribers.length === 0}
        >
          <SendHorizonal className="w-4 h-4" />
          Envoyer un message
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSubscribers(filteredSubscribers.map(s => s.id));
                    } else {
                      setSelectedSubscribers([]);
                    }
                  }}
                />
              </TableHead>
              <TableHead>Numéro</TableHead>
              <TableHead>Pays</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead>Dernière interaction</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscribers.map((subscriber) => (
              <TableRow key={subscriber.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedSubscribers.includes(subscriber.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSubscribers([...selectedSubscribers, subscriber.id]);
                      } else {
                        setSelectedSubscribers(selectedSubscribers.filter(id => id !== subscriber.id));
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{subscriber.phone_number}</TableCell>
                <TableCell>{subscriber.country_code}</TableCell>
                <TableCell>
                    <Badge variant={subscriber.status === 'active' ? 'success' : 'default'}>
                        {subscriber.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(subscriber.opt_in_date), 'dd MMM yyyy', { locale: fr })}
                </TableCell>
                <TableCell>
                  {subscriber.last_interaction_date 
                    ? format(new Date(subscriber.last_interaction_date), 'dd MMM yyyy', { locale: fr })
                    : '-'
                  }
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {subscriber.tags.map(tag => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setMessageText('');
                        setSelectedSubscribers([subscriber.id]);
                        setIsMessageDialogOpen(true);
                      }}>
                        <SendHorizonal className="mr-2 h-4 w-4" />
                        Envoyer un message
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          // Handle delete
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Envoyer un message</DialogTitle>
            <DialogDescription>
              Le message sera envoyé à {selectedSubscribers.length} abonné{selectedSubscribers.length > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Écrivez votre message..."
              className="min-h-[200px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsMessageDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSendMessage}
              className="flex items-center gap-2"
            >
              <SendHorizonal className="w-4 h-4" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}