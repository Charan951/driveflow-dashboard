import React, { useEffect, useState } from 'react';
import { bookingService, Booking } from '../../services/bookingService';
import { reviewService } from '../../services/reviewService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Star, MessageSquarePlus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Review Dialog State
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await bookingService.getMyBookings();
      setBookings(data);
    } catch (error) {
      toast.error('Failed to fetch your bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Booked': return 'secondary';
      case 'In Garage': return 'default';
      case 'Servicing': return 'warning';
      case 'Ready': return 'success';
      case 'Delivered': return 'success';
      case 'Cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleReviewClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setRating(5);
    setComment('');
    setReviewOpen(true);
  };

  const submitReview = async () => {
    if (!selectedBooking) return;

    setSubmittingReview(true);
    try {
      await reviewService.createReview({
        booking: selectedBooking._id,
        rating,
        comment,
        category: selectedBooking.merchant ? 'Merchant' : 'Platform',
        target: selectedBooking.merchant?._id
      });
      toast.success('Review submitted successfully!');
      setReviewOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const activeBookings = bookings.filter(b => !['Delivered', 'Cancelled', 'Completed'].includes(b.status));
  const pastBookings = bookings.filter(b => ['Delivered', 'Cancelled', 'Completed'].includes(b.status));

  const renderBookingsTable = (bookingsList: Booking[], emptyMessage: string) => {
      if (bookingsList.length === 0) {
        return (
          <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
            <p>{emptyMessage}</p>
            <Button variant="link" onClick={() => navigate('/book-service')} className="mt-2 text-primary">
              Book a Service
            </Button>
          </div>
        );
      }

      return (
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookingsList.map((booking) => (
                <TableRow key={booking._id}>
                  <TableCell>{format(new Date(booking.date), 'PPP')}</TableCell>
                  <TableCell>
                    {typeof booking.vehicle === 'object' 
                      ? `${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.licensePlate})`
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {Array.isArray(booking.services) 
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ? booking.services.map((s: any) => s.name).join(', ') 
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Badge variant={getStatusColor(booking.status) as any}>
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell>₹{booking.totalAmount}</TableCell>
                  <TableCell className="capitalize">{booking.paymentStatus}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/track/${booking._id}`)}
                            title="Track Booking"
                        >
                            <Eye className="w-4 h-4" />
                        </Button>
                        {booking.status === 'Delivered' && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleReviewClick(booking)}
                            className="flex items-center gap-1"
                        >
                            <MessageSquarePlus className="w-4 h-4" />
                            Review
                        </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <Button onClick={() => navigate('/book-service')}>
            New Booking
        </Button>
      </div>
      
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-6">
          <TabsTrigger value="live">Live Bookings</TabsTrigger>
          <TabsTrigger value="past">Past History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="live">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Active Bookings
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {renderBookingsTable(activeBookings, "No active bookings found.")}
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="past">
            <Card>
                <CardHeader>
                    <CardTitle>Booking History</CardTitle>
                </CardHeader>
                <CardContent>
                    {renderBookingsTable(pastBookings, "No past bookings found.")}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your experience with this service.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us about your experience..."
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={submitReview} disabled={submittingReview}>
              {submittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBookingsPage;
