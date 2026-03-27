import React, { useEffect, useState } from 'react';
import { bookingService, Booking } from '../../services/bookingService';
import { reviewService } from '../../services/reviewService';
import { getMyApprovals, updateApprovalStatus, ApprovalRequest } from '../../services/approvalService';
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
import { Loader2, Star, MessageSquarePlus, AlertCircle, CheckCircle, XCircle, Wrench, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Review Dialog State
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [merchantRating, setMerchantRating] = useState(5);
  const [merchantComment, setMerchantComment] = useState('');
  const [platformRating, setPlatformRating] = useState(5);
  const [platformComment, setPlatformComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsData, approvalsData] = await Promise.all([
        bookingService.getMyBookings(),
        getMyApprovals()
      ]);
      setBookings(bookingsData);
      setApprovals(approvalsData.filter((a: ApprovalRequest) => a.status === 'Pending'));
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
        await updateApprovalStatus(id, status);
        toast.success(`Request ${status}`);
        fetchData(); // Refresh list
    } catch (error) {
        toast.error('Action failed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREATED':
      case 'ASSIGNED':
      case 'ACCEPTED':
      case 'STAFF_REACHED_MERCHANT':
        return 'secondary';
      case 'REACHED_CUSTOMER':
      case 'VEHICLE_PICKED':
      case 'REACHED_MERCHANT':
      case 'PICKUP_BATTERY_TIRE':
        return 'warning';
      case 'SERVICE_STARTED':
      case 'CAR_WASH_STARTED':
      case 'INSTALLATION':
        return 'warning';
      case 'SERVICE_COMPLETED':
      case 'CAR_WASH_COMPLETED':
      case 'OUT_FOR_DELIVERY':
      case 'READY':
        return 'success';
      case 'DELIVERED':
      case 'COMPLETED':
      case 'DELIVERY':
        return 'success';
      case 'CANCELLED':
        return 'destructive';
      default: return 'secondary';
    }
  };

  const handleReviewClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setMerchantRating(5);
    setMerchantComment('');
    setPlatformRating(5);
    setPlatformComment('');
    setReviewOpen(true);
  };

  const submitReview = async () => {
    if (!selectedBooking) return;

    setSubmittingReview(true);
    try {
      const reviewPromises = [];

      // Merchant Review
      if (selectedBooking.merchant) {
        reviewPromises.push(
          reviewService.createReview({
            booking: selectedBooking._id,
            rating: merchantRating,
            comment: merchantComment,
            category: 'Merchant',
            target: selectedBooking.merchant?._id
          })
        );
      }

      // Platform Review
      reviewPromises.push(
        reviewService.createReview({
          booking: selectedBooking._id,
          rating: platformRating,
          comment: platformComment,
          category: 'Platform'
        })
      );

      await Promise.all(reviewPromises);
      toast.success('Reviews submitted successfully!');
      setReviewOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to submit reviews');
    } finally {
      setSubmittingReview(false);
    }
  };

  const activeBookings = bookings.filter(b => !['DELIVERED', 'CANCELLED', 'COMPLETED'].includes(b.status));
  const pastBookings = bookings.filter(b => ['DELIVERED', 'CANCELLED', 'COMPLETED'].includes(b.status));

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
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingsList.map((booking) => {
                  const additionalParts = Array.isArray(booking.inspection?.additionalParts)
                    ? booking.inspection.additionalParts
                    : [];
                  const approvedParts = additionalParts.filter(
                    (p) => p.approvalStatus === 'Approved' || p.approved
                  );
                  const approvedPartsCount = approvedParts.length;
                  const approvedPartsTotal = approvedParts.reduce(
                    (sum, part) => sum + (part.price || 0) * (part.quantity || 1),
                    0
                  );

                  // Check if this is a battery/tire service with warranty
                  const isBatteryOrTireService = Array.isArray(booking.services) && 
                    booking.services.some((service: any) => 
                      typeof service === 'object' && service !== null && 
                      ['Battery', 'Tyres', 'Tyre & Battery'].includes(service.category)
                    );
                  const hasWarranty = isBatteryOrTireService && booking.batteryTire?.warranty;

                  return (
                  <TableRow 
                    key={booking._id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/track/${booking._id}`)}
                  >
                    <TableCell>{format(new Date(booking.date), 'PPP')}</TableCell>
                    <TableCell>
                      {typeof booking.vehicle === 'object' 
                        ? `${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.licensePlate})`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {Array.isArray(booking.services) 
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ? booking.services.map((s: any) => typeof s === 'string' ? s : s.name).join(', ') 
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Badge variant={getStatusColor(booking.status) as any}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>₹{booking.totalAmount}</span>
                        {approvedPartsCount > 0 && (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            {approvedPartsCount} extra part{approvedPartsCount > 1 ? 's' : ''} · ₹{approvedPartsTotal}
                          </span>
                        )}
                        {hasWarranty && (
                          <span className="text-xs text-green-600 inline-flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {booking.batteryTire?.warranty?.warrantyMonths} months warranty
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize flex items-center justify-between">
                      <span>{booking.paymentStatus}</span>
                      {(booking.status === 'DELIVERED' || booking.status === 'COMPLETED') && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReviewClick(booking);
                            }}
                            className="flex items-center gap-1"
                        >
                            <MessageSquarePlus className="w-4 h-4" />
                            Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {bookingsList.map((booking) => {
              const additionalParts = Array.isArray(booking.inspection?.additionalParts)
                ? booking.inspection.additionalParts
                : [];
              const approvedParts = additionalParts.filter(
                (p) => p.approvalStatus === 'Approved' || p.approved
              );
              const approvedPartsCount = approvedParts.length;
              const approvedPartsTotal = approvedParts.reduce(
                (sum, part) => sum + (part.price || 0) * (part.quantity || 1),
                0
              );

              // Check if this is a battery/tire service with warranty
              const isBatteryOrTireService = Array.isArray(booking.services) && 
                booking.services.some((service: any) => 
                  typeof service === 'object' && service !== null && 
                  ['Battery', 'Tyres', 'Tyre & Battery'].includes(service.category)
                );
              const hasWarranty = isBatteryOrTireService && booking.batteryTire?.warranty;

              return (
                <Card 
                  key={booking._id} 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/track/${booking._id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(booking.date), 'PPP')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {typeof booking.vehicle === 'object' 
                          ? `${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.licensePlate})`
                          : 'N/A'}
                      </p>
                    </div>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Badge variant={getStatusColor(booking.status) as any} className="flex-shrink-0">
                      {booking.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Services</p>
                      <p className="text-sm font-medium">
                        {Array.isArray(booking.services) 
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          ? booking.services.map((s: any) => typeof s === 'string' ? s : s.name).join(', ') 
                          : 'N/A'}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Amount</p>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">₹{booking.totalAmount}</span>
                          {approvedPartsCount > 0 && (
                            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                              <Wrench className="w-3 h-3" />
                              {approvedPartsCount} extra part{approvedPartsCount > 1 ? 's' : ''} · ₹{approvedPartsTotal}
                            </span>
                          )}
                          {hasWarranty && (
                            <span className="text-xs text-green-600 inline-flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {booking.batteryTire?.warranty?.warrantyMonths} months warranty
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Payment</p>
                        <p className="text-sm font-medium capitalize">{booking.paymentStatus}</p>
                      </div>
                    </div>
                  </div>

                  {(booking.status === 'DELIVERED' || booking.status === 'COMPLETED') && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReviewClick(booking);
                        }}
                        className="flex-1"
                      >
                        <MessageSquarePlus className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full h-full py-6 sm:py-8 overflow-hidden">
      
      {/* Pending Approvals Section */}
      {approvals.length > 0 && (
        <div className="mb-6 sm:mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="min-w-0">Action Required</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {approvals.map(approval => (
              <div key={approval._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-amber-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 flex-shrink-0">
                    {approval.type === 'PartReplacement' ? 'Part Replacement' : 
                     approval.type === 'ExtraCost' ? 'Extra Cost' : approval.type}
                  </Badge>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {format(new Date(approval.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  {approval.data?.image && (
                      <div className="mb-2">
                          <img 
                            src={approval.data.image as string} 
                            alt="Part" 
                            className="w-full h-32 object-cover rounded-md"
                          />
                      </div>
                  )}
                  {Object.entries(approval.data || {}).map(([key, value]) => {
                      if (key === 'image') return null;
                      return (
                        <div key={key} className="flex justify-between text-sm gap-2">
                          <span className="text-gray-500 capitalize flex-shrink-0">{key}:</span>
                          <span className="font-medium text-right min-w-0 break-words">{String(value)}</span>
                        </div>
                      );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprovalAction(approval._id, 'Approved')}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => handleApprovalAction(approval._id, 'Rejected')}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h1>
      </div>
      
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full max-w-full sm:max-w-[400px] grid-cols-2 mb-6">
          <TabsTrigger value="live" className="text-sm">Live Bookings</TabsTrigger>
          <TabsTrigger value="past" className="text-sm">Past History</TabsTrigger>
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your experience with our platform and the service center.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {selectedBooking?.merchant && (
              <div className="space-y-4 pb-4 border-b">
                <h3 className="font-semibold text-primary">Service Center Feedback</h3>
                <div className="flex flex-col gap-2">
                  <Label>Merchant Rating</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setMerchantRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= merchantRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="merchant-comment">Merchant Comment</Label>
                  <Textarea
                    id="merchant-comment"
                    value={merchantComment}
                    onChange={(e) => setMerchantComment(e.target.value)}
                    placeholder="Tell us about the workshop service..."
                    className="col-span-3"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-primary">Platform Feedback</h3>
              <div className="flex flex-col gap-2">
                <Label>Platform Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setPlatformRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= platformRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="platform-comment">Platform Comment</Label>
                <Textarea
                  id="platform-comment"
                  value={platformComment}
                  onChange={(e) => setPlatformComment(e.target.value)}
                  placeholder="Tell us about your experience with our app/company..."
                  className="col-span-3"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={submitReview} disabled={submittingReview}>
              {submittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Reviews
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBookingsPage;
