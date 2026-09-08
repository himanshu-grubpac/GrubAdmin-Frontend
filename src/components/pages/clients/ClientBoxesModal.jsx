"use client";
import React, { useCallback, useEffect, useState } from "react";
import { boxService } from "@/api/services/boxService";
import LoadingDetails from "@/components/ui/LoadingDetails";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";

const healthColorMap = {
  healthy: "text-green-500",
  attention: "text-yellow-500",
  critical: "text-red-500",
};

const statusDotMap = {
  healthy: "bg-green-500",
  attention: "bg-yellow-400",
  critical: "bg-red-500",
};

const ClientBoxesModal = ({ open, onClose, clientId, clientName }) => {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBoxes = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await boxService.getBoxes({
        client_id: clientId,
        page_number: 1,
        page_size: 100,
      });
      if (response?.success && response?.code === 200) {
        setBoxes(response.data?.boxes || []);
      } else {
        setError("Failed to load boxes.");
      }
    } catch {
      setError("Failed to load boxes.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (open) fetchBoxes();
    else setBoxes([]);
  }, [open, fetchBoxes]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">

        {/* Title - Client name like "Super Admin" heading */}
        <div className="px-8 pt-8 pb-4">
          <h2 className="text-2xl font-bold text-[var(--color-neutral-primary)]">
            {clientName}
          </h2>
        </div>

        {/* Table header */}
        <div className="px-8">
          <div className="grid grid-cols-12 py-3 border-b border-[var(--color-stroke-neutral)]">
            <div className="col-span-5 text-sm text-[var(--color-stroke-brand)]">Name</div>
            <div className="col-span-3 text-sm text-[var(--color-stroke-brand)]">Status</div>
            <div className="col-span-2 text-sm text-[var(--color-stroke-brand)]">Battery</div>
            <div className="col-span-2 text-sm text-[var(--color-stroke-brand)]">Temp</div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8">
          {loading ? (
            <div className="py-8">
              <LoadingDetails entity="boxes" />
            </div>
          ) : error ? (
            <p className="text-red-500 text-sm text-center py-8">{error}</p>
          ) : boxes.length === 0 ? (
            <EmptyState
              title="No boxes assigned"
              description="This client has no GrubPacs assigned yet."
              buttonLabel={null}
            />
          ) : (
            boxes.map((box, index) => {
              const isEven = index % 2 !== 0;
              const healthColor = healthColorMap[box.health_status] ?? "text-gray-400";
              const statusDot = statusDotMap[box.health_status] ?? "bg-gray-300";

              return (
                <div
                  key={box.id}
                  className={`grid grid-cols-12 py-4 border-b border-[var(--color-stroke-neutral)] last:border-b-0 ${
                    isEven ? "bg-[var(--color-neutral-secondary-bg)]" : "bg-white"
                  }`}
                >
                  {/* Name + ID */}
                  <div className="col-span-5">
                    <div className="font-semibold text-base text-[var(--color-neutral-primary)]">
                      {box.name}
                    </div>
                    <div className="text-sm text-[var(--color-stroke-brand)] mt-0.5">
                      {box.box_display_id}
                      {box.vehicle_number ? ` | ${box.vehicle_number}` : ""}
                    </div>
                  </div>

                  {/* Health status */}
                  <div className="col-span-3 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
                    <span className={`text-sm font-medium capitalize ${healthColor}`}>
                      {box.health_status ?? "Unknown"}
                    </span>
                  </div>

                  {/* Battery */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-[var(--color-neutral-primary)]">
                      {box.battery_percentage != null ? `${box.battery_percentage}%` : "—"}
                    </span>
                  </div>

                  {/* Temp */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-[var(--color-neutral-primary)]">
                      {box.zone1_temp != null ? `${box.zone1_temp}°C` : "—"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-[var(--color-stroke-neutral)] flex items-center justify-between">
          <span className="text-sm text-[var(--color-neutral-secondary)]">
            {boxes.length} {boxes.length === 1 ? "box" : "boxes"} assigned
          </span>
          <Button
            variant="grayOutline"
            onClick={onClose}
            className="px-10 py-3"
          >
            CLOSE
          </Button>
        </div>

      </div>
    </div>
  );
};

export default ClientBoxesModal;