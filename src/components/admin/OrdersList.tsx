import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Download, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { fileStorage } from '@/services/fileStorage';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { orderService } from '@/services/supabaseService';

type OrderFile = {
  name: string;
  size: number;
  type: string;
  path?: string;
};

type Order = {
  id: string;
  order_id: string;
  full_name: string;
  phone_number: string;
  print_type: string;
  copies: number;
  paper_size: string;
  special_instructions?: string;
  files: OrderFile[];
  created_at: string;
  status: string;
  total_cost: number;
  print_side: string;
  selected_pages?: string;
  color_pages?: string;
  bw_pages?: string;
  binding_color_type?: string;
};

const OrdersList = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScrollPosition, setMaxScrollPosition] = useState(100);
  const ordersPerPage = 10;

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const fetchedOrders = await orderService.getAllOrders();
      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      
      // Update local state
      const updatedOrders = orders.map(order => 
        order.order_id === orderId ? { ...order, status: newStatus } : order
      );
      
      setOrders(updatedOrders);
      
      if (selectedOrder?.order_id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }

      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  // Handle scroll position updates
  const handleScrollPositionChange = (value: number[]) => {
    const newPosition = value[0];
    setScrollPosition(newPosition);
    
    // Find the scroll container and update its scroll position
    const scrollContainer = document.querySelector('[data-scroll-container]');
    if (scrollContainer) {
      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const scrollTop = (newPosition / 100) * maxScroll;
      scrollContainer.scrollTop = scrollTop;
    }
  };

  // Update scroll position when user scrolls manually
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const maxScroll = target.scrollHeight - target.clientHeight;
    const currentScroll = target.scrollTop;
    const percentage = maxScroll > 0 ? (currentScroll / maxScroll) * 100 : 0;
    setScrollPosition(percentage);
  };

  // Update max scroll position when dialog content changes
  useEffect(() => {
    if (dialogOpen && selectedOrder) {
      setTimeout(() => {
        const scrollContainer = document.querySelector('[data-scroll-container]');
        if (scrollContainer) {
          const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
          setMaxScrollPosition(maxScroll > 0 ? 100 : 0);
        }
      }, 100);
    }
  }, [dialogOpen, selectedOrder]);

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
    setScrollPosition(0);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPrintTypeName = (type: string) => {
    switch (type) {
      case 'blackAndWhite': return 'Black & White';
      case 'color': return 'Color';
      case 'custom': return 'Custom (Mixed)';
      case 'softBinding': return 'Soft Binding';
      case 'spiralBinding': return 'Spiral Binding';
      case 'customPrint': return 'Custom Print';
      default: return type;
    }
  };

  const getBindingColorTypeName = (type: string) => {
    switch (type) {
      case 'blackAndWhite': return 'Black & White';
      case 'color': return 'Color';
      case 'custom': return 'Custom (Mixed)';
      default: return type;
    }
  };
  
  const getPaperSizeName = (size: string) => {
    return size?.toUpperCase() || 'N/A';
  };

  const handleFileDownload = (file: OrderFile) => {
    try {
      if (!file.path) {
        file.path = `/uploads/${file.name}`;
      }
      
      const storedFile = fileStorage.getFile(file.path);
      
      if (!storedFile) {
        const allFiles = fileStorage.getAllFiles();
        const fileByName = allFiles.find(f => f.name === file.name);
        if (fileByName) {
          const url = fileStorage.createDownloadUrl(fileByName);
          if (url) {
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success(`Downloading ${file.name}`);
            return;
          }
        }
        toast.error("File not found in storage");
        return;
      }
      
      if (!storedFile.data) {
        toast.error("File data is not available");
        return;
      }
      
      const url = URL.createObjectURL(storedFile.data);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Downloading ${file.name}`);
    } catch (error) {
      console.error('Error handling file download:', error);
      toast.error("Failed to download file");
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(orders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = orders.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading orders...</p>
      </div>
    );
  }

  return (
    <div>
      {orders.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Order ID</TableHead>
                  <TableHead className="min-w-[120px]">Customer</TableHead>
                  <TableHead className="min-w-[140px]">Date</TableHead>
                  <TableHead className="min-w-[120px]">Print Type</TableHead>
                  <TableHead className="min-w-[80px]">Copies</TableHead>
                  <TableHead className="min-w-[80px]">Cost</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.order_id}</TableCell>
                    <TableCell>{order.full_name}</TableCell>
                    <TableCell className="text-xs">{formatDate(order.created_at)}</TableCell>
                    <TableCell className="text-xs">{getPrintTypeName(order.print_type)}</TableCell>
                    <TableCell>{order.copies || 'N/A'}</TableCell>
                    <TableCell className="text-xs">
                      {order.print_type === 'customPrint' ? 'Quote Required' : `₹${order.total_cost?.toFixed(2) || '0.00'}`}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewOrderDetails(order)}
                        className="text-xs"
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1} to {Math.min(endIndex, orders.length)} of {orders.length} orders
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {selectedOrder && (
          <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-lg sm:text-xl">Order Details - {selectedOrder.order_id}</DialogTitle>
              <DialogDescription className="text-sm">
                Submitted on {formatDate(selectedOrder.created_at)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-1 gap-2 sm:gap-4 min-h-0">
              {/* Main content area */}
              <div className="flex-1 min-w-0">
                <ScrollArea 
                  className="h-full pr-2 sm:pr-4"
                  data-scroll-container
                  onScroll={handleScroll}
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium text-gray-700 text-sm sm:text-base">Customer Information</h3>
                        <div className="mt-2 space-y-1 text-sm">
                          <p><span className="font-medium">Name:</span> {selectedOrder.full_name}</p>
                          <p><span className="font-medium">Phone:</span> {selectedOrder.phone_number}</p>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-gray-700 text-sm sm:text-base">Order Status</h3>
                        <div className="mt-2 flex flex-wrap gap-1 sm:gap-2">
                          <Button 
                            size="sm" 
                            variant={selectedOrder.status === 'pending' ? 'default' : 'outline'}
                            className={`text-xs ${selectedOrder.status === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
                            onClick={() => handleStatusChange(selectedOrder.order_id, 'pending')}
                          >
                            Pending
                          </Button>
                          <Button 
                            size="sm" 
                            variant={selectedOrder.status === 'processing' ? 'default' : 'outline'}
                            className={`text-xs ${selectedOrder.status === 'processing' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                            onClick={() => handleStatusChange(selectedOrder.order_id, 'processing')}
                          >
                            Processing
                          </Button>
                          <Button 
                            size="sm" 
                            variant={selectedOrder.status === 'completed' ? 'default' : 'outline'}
                            className={`text-xs ${selectedOrder.status === 'completed' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                            onClick={() => handleStatusChange(selectedOrder.order_id, 'completed')}
                          >
                            Completed
                          </Button>
                          <Button 
                            size="sm" 
                            variant={selectedOrder.status === 'cancelled' ? 'default' : 'outline'}
                            className={`text-xs ${selectedOrder.status === 'cancelled' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                            onClick={() => handleStatusChange(selectedOrder.order_id, 'cancelled')}
                          >
                            Cancelled
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h3 className="font-medium text-gray-700 text-sm sm:text-base">Print Details</h3>
                      <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs sm:text-sm text-gray-500">Print Type</p>
                          <p className="text-sm">{getPrintTypeName(selectedOrder.print_type)}</p>
                          
                          {/* Show binding color type for binding orders */}
                          {(selectedOrder.print_type === 'softBinding' || selectedOrder.print_type === 'spiralBinding') && selectedOrder.binding_color_type && (
                            <>
                              <p className="mt-2 text-xs sm:text-sm text-gray-500">Binding Color Type</p>
                              <p className="text-sm">{getBindingColorTypeName(selectedOrder.binding_color_type)}</p>
                            </>
                          )}
                          
                          {/* Show custom print details */}
                          {selectedOrder.print_type === 'custom' && (
                            <>
                              <p className="mt-2 text-xs sm:text-sm text-gray-500">Color Pages</p>
                              <p className="text-sm">{selectedOrder.color_pages || 'None'}</p>
                              <p className="mt-2 text-xs sm:text-sm text-gray-500">B&W Pages</p>
                              <p className="text-sm">{selectedOrder.bw_pages || 'None'}</p>
                            </>
                          )}
                          
                          {/* Show binding custom details */}
                          {(selectedOrder.print_type === 'softBinding' || selectedOrder.print_type === 'spiralBinding') && selectedOrder.binding_color_type === 'custom' && (
                            <>
                              <p className="mt-2 text-xs sm:text-sm text-gray-500">Color Pages (Binding)</p>
                              <p className="text-sm">{selectedOrder.color_pages || 'None'}</p>
                              <p className="mt-2 text-xs sm:text-sm text-gray-500">B&W Pages (Binding)</p>
                              <p className="text-sm">{selectedOrder.bw_pages || 'None'}</p>
                            </>
                          )}
                          
                          {/* Show selected pages for non-custom orders */}
                          {selectedOrder.print_type !== 'custom' && selectedOrder.print_type !== 'customPrint' && selectedOrder.selected_pages && (
                            <>
                              <p className="mt-2 text-xs sm:text-sm text-gray-500">Selected Pages</p>
                              <p className="text-sm">{selectedOrder.selected_pages}</p>
                            </>
                          )}
                        </div>
                        <div>
                          {selectedOrder.print_type !== 'customPrint' && (
                            <>
                              <p className="text-xs sm:text-sm text-gray-500">Print Side</p>
                              <p className="text-sm">{selectedOrder.print_side === 'double' ? 'Double Sided' : 'Single Sided'}</p>
                              <p className="mt-2 text-xs sm:text-sm text-gray-500">Paper Size</p>
                              <p className="text-sm">{getPaperSizeName(selectedOrder.paper_size)}</p>
                              <p className="mt-2 text-xs sm:text-sm text-gray-500">Copies</p>
                              <p className="text-sm">{selectedOrder.copies}</p>
                            </>
                          )}
                          <p className="mt-2 text-xs sm:text-sm text-gray-500">Total Cost</p>
                          <p className="font-semibold text-sm">
                            {selectedOrder.print_type === 'customPrint' ? 'Quote Required' : `₹${selectedOrder.total_cost?.toFixed(2) || '0.00'}`}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {selectedOrder.special_instructions && (
                      <div className="border-t pt-4">
                        <h3 className="font-medium text-gray-700 text-sm sm:text-base">Special Instructions</h3>
                        <p className="mt-2 text-gray-800 whitespace-pre-line text-sm">{selectedOrder.special_instructions}</p>
                      </div>
                    )}
                    
                    <div className="border-t pt-4">
                      <h3 className="font-medium text-gray-700 text-sm sm:text-base">Files ({selectedOrder.files.length})</h3>
                      <div className="mt-2 space-y-2">
                        {selectedOrder.files.map((file, index) => (
                          <div key={index} className="file-item flex justify-between items-center p-2 sm:p-3">
                            <div className="flex items-center min-w-0 flex-1">
                              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-xerox-600 mr-2 sm:mr-3 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="ml-2 text-blue-600 text-xs flex-shrink-0"
                              onClick={() => handleFileDownload(file)}
                            >
                              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">Download</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
              
              {/* Scroll bar - only show on larger screens */}
              {maxScrollPosition > 0 && (
                <div className="hidden sm:flex flex-col items-center justify-center w-8 bg-gray-50 rounded-lg p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 mb-2"
                    onClick={() => handleScrollPositionChange([Math.max(0, scrollPosition - 10)])}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  
                  <div className="flex-1 flex items-center justify-center min-h-[200px]">
                    <Slider
                      value={[scrollPosition]}
                      onValueChange={handleScrollPositionChange}
                      max={100}
                      min={0}
                      step={1}
                      orientation="vertical"
                      className="h-full"
                    />
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 mt-2"
                    onClick={() => handleScrollPositionChange([Math.min(100, scrollPosition + 10)])}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default OrdersList;